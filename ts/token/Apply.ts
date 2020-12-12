import {Stack} from '../Stack';
import {Token, TokenArray, ApplyData} from './Token';
import {Operand} from './Operand';
import {Operator} from './Operator';
import {Delimiter} from './Delimiter';
import {Group} from './Group';
import {AstObject} from '../ast/Node';
import {FuncName, FuncApply, FuncExp} from '../ast/Func';

/**
 * The classes needed for functions
 */

/*****************************************************************************/

/**
 * The function application operator, either implicit or explicit
 *   (inserted between function name and its argument list)
 */
export class ApplyOp extends Operator {

  public applyData: ApplyData;   // Data about function arguments, etc.

  /**
   * Propagate the ApplyData from the given token.
   */
  constructor(stack: Stack, token: Token) {
    super(stack);
    token.copyApplyDataTo(this);
  }

  /**
   * Get the AST tree, the ApplyOp precedence, and whether our precedence is the same
   * If the AST tree is a Name object (a named function, followed by its arguments),
   *   Move the function name to the tree's value and out of the child array (the arguments to the function).
   *   Set the tree's autoApply if it isn't already correct.
   * Otherwise (the funciton is a funciton expression)
   *   Remove the function expression from the child array (the arguments to the function).
   *   Create a FuncExp node using the expression, arguments, and other values.
   * Return the modified tree.
   */
  public tree() {
    let tree = this.ast as any as FuncApply | FuncExp;
    const prec = (this.stack.parser.getBaseClass('ApplyOp').prototype as any as Operator).precedence;
    const auto = (prec === this.precedence);
    if (this.isast('Name', tree.childNodes[0])) {
      tree.value = (tree.childNodes.shift() as AstObject).value;
      if (auto !== tree.autoApply) {
        tree.autoApply = auto;
      }
    } else {
      const exp = tree.childNodes.shift();
      tree = this.createAst('FuncExp', exp, tree.childNodes, auto, prec) as FuncExp;
    }
    return tree;
  }

  /**
   * If there is no argument list (only the function name or expression),
   *   report the error.
   * Pop us off the stack.
   * Append the function or expression to the stack top (to form a function expression, if possible).
   */
  public group(_item: Token) {
    if (this.ast.childNodes.length < 2) {
      this.error('Missing argument for ' + this.name);
    }
    this.stack.pop();
    this.stack.top().append(this.createToken('Tree', this));
    return false;
  }

  /**
   * If the appended item is a asgeroup of arguments (a Group that has isApply set),
   *   Get its child nodes.
   *   If there are the wrong number of arguments, report an error.
   *   Append the arguments to our AST tree.
   *   return the appended token.
   * Otherwise, do the standard append action.
   */
  public append(token: Token) {
    if (this.ast.childNodes.length && token.isa('Group') && (token as Group).isApply) {
      let tree = token.tree().childNodes;
      if (this.applyData.args !== tree.length && this.applyData.args !== Infinity) {
        this.error('Wrong number of arguments for ' + this.name);
      }
      for (const node of tree) {
        this.ast.append(node);
      }
      return token;
    }
    return super.append(token);
  }

  /**
   * Return the function name (expression) with '()' appended
   */
  get name() {
    return this.ast.childNodes[0].toString() + '()';
  }

}

/*****************************************************************************/

/**
 * Subclass of ApplyOp for explicit function arguments in parentheses
 */
export class ApplyArgument extends ApplyOp {

  /**
   * True of the top token is not already a function application,
   *   or the standard check is true.
   */
  protected checkIsHigherPrecedence(prev: Token, top: Token) {
    return (!top.applyData) || super.checkIsHigherPrecedence(prev, top);
  }

}


/*****************************************************************************/

/**
 * Operator inserted after a named function or function expression to handle
 *   a following argument or argument group.  Allows functions with no arguments,
 *   when that is allowed.
 */
export class ApplyPending extends Operator {

  public applyData: ApplyData;   // Data about function arguments, etc.


  /**
   * Propagate the ApplyData from the given token.
   */
  constructor(stack: Stack, token: Token) {
    super(stack);
    token.copyApplyDataTo(this);
  }

  /**
   * Check the next token to see how we need to handle it.
   */
  public followedBy(token: Token): TokenArray | null {
    return this.checkOperator(token) || this.checkOperand(token) || this.checkDelimiter(token);
  }

  /**
   * We apply to whatever topen precedes us.
   */
  public follows(_token: Token) {
    return [this];
  }

  /**
   * If the following token is an operator, don't check further.
   * Otherwise, pop us off the stack and get the previous stack item.
   * If there is not a required argument, we go back on the stack
   * Check if we need to auto apply to an argument, and report an error if we do
   */
  protected checkOperator(token: Token): TokenArray | null {
    if (!token.isa('Operator')) return null;
    this.stack.pop();
    const prev = this.stack.top();
    if (this.checkRequiredArgument(token)) return [this];
    const result = this.checkAutoApply(token);
    if (!result) {
      this.error('Missing argument for ' + prev.ast.toString());
    }
    return result;
  }

  /**
   * If we don't require an argument or the following token is an operator that applies to the left,
   *   Push the operator on the stack, and get the top stack item.
   *   If the top is a function expression,
   *     Set the pending apply precedence to be the precedence of the operator
   *     Indicate that we still need to be processed further
   * Otherwise, indicate that we havn't processed a required argument.
   */
  protected checkRequiredArgument(token: Token) {
    if (!this.applyData.requireArgument || (token as Operator).appliesLeft) {
      this.stack.push(token);
      const top = this.stack.top();
      if (top.canApply) {
        this.precedence = (token as Operator).precedence;
        return true;
      }
    }
    return false;
  }

  /**
   * If the function auto-applies to arguements (i.e., don't need parens),
   *   If the following operator can be a unary operator,
   *      Push us and the operator as a unary operator.
   *   Otherwise, if the token is a Juxtapose token, we get pushed  (FIXME:  Is this needed?)
   */
  protected checkAutoApply(token: Token) {
    if (this.applyData.autoApply) {
      if ((token as Operator).canBeLeftUnary) {
        return [this, (token as Operator).makeUnary()];
      }
      if (token.isa('Juxtapose')) return [this];
    }
    return null;
  }

  /**
   * If the following token isn't an operand, don't check further.
   * Pop us off the stack.
   * If the (new) top item is an Operator (i.e., we are building a function expression)
   *   Push the next token (try to extend the expression)
   *   Then process us again (keep extending, or process argument)
   * Otherwise (the token is an argument)
   *  Try to apply the function to the argument token.
   *  If not successful, put the token.
   */
  protected checkOperand(token: Token) {
    if (!(token.isa('Operand'))) return null;
    const stack = this.stack;
    stack.pop();
    if (stack.top().isa('Operator')) {
      stack.push(token);
      return [this];
    }
    if (!this.pushApplyOp(token)) return null;
    stack.push(token);
    return [];
  }

  /**
   * If the token is a Delimiter and it is for function application,
   *   Mark the delimiter as not being removable.
   */
  protected checkDelimiter(token: Token) {
    if (token.isa('Delimiter') && (token as Delimiter).isApply) {
      (token as Delimiter).removable = false;
    }
    return null;
  }

  /**
   * When the group ends with no argument found,
   *   Pop the pending apply.
   *   If an argument is required,
   *     Push an ApplyArgument token to report the error
   */
  public group(_item: Token) {
    this.stack.pop();
    if (this.applyData.requireArgument) {
      this.stack.push(this.createToken('ApplyArgument', this));
    }
    return false;
  }

  /**
   * When a token is appended,
   *   Pop the pending apply.
   *   If the top item on the stack is an operator,
   *     Append the token to the operator
   *   Otherwise
   *     Append the token to whatever it is
   * Return the procerssed token.
   */
  public append(token: Token) {
    this.stack.pop();
    if (this.stack.top().isa('Operator')) {
      this.appendOperator(token);
    } else {
      this.appendOther(token);
    }
    return token;
  }

  /**
   * Append the token to the top operator (completing it)
   * Push the result as a Tree token.
   * Set our precedence to that of the ApplyPending class again
   * Push us back on the stack.
   */
  protected appendOperator(token: Token) {
    const stack = this.stack;
    stack.top().append(token);
    stack.push(this.createToken('Tree', stack.pop()));
    this.precedence = (this.constructor as typeof ApplyPending).prototype.precedence;
    stack.push(this);
  }

  /**
   * Push either the explicit or implicit apply operator.
   * If the item was created, append the argument tree to its AST.
   */
  protected appendOther(token: Token) {
    const item = this.pushApplyOp(token);
    if (item) {
      (item as Token).ast.append(token.tree());
    }
  }

  /**
   * Create an explicit (ApplyArgument) or implicit (ApplyOp) token for the
   *   given argument token.
   * If it was neither, then
   *   If we don't require an argument, return null.
   *   Otherwise give an error abot the missing argument.
   * Otherwise, push the item and return it.
   */
  protected pushApplyOp(token: Token) {
    const item = ((token as Group).isApply ? this.createToken('ApplyArgument', this) :
                  this.applyData.autoApply ? this.createToken('ApplyOp', this) : null);
    if (!item) {
      if (!this.applyData.requireArgument) return null;
      this.error('Function argument must be enclosed');
    }
    this.stack.push(item as Token);
    return item;
  }

}

/*****************************************************************************/

/**
 * A function (either a named function or a funciotn expression)
 */
export class Apply extends Operand {

  public args: number;                // number of arguments (Infinity means any number)
  public autoApply: boolean;          // true if parentheses not required for funciton call
  public requireArgument: boolean;    // true if argument must be present
  public isInvertible: boolean;       // true if function has an inverse function

  public applyData: ApplyData;        // data about this function or function expression's argument requirements
  public canApply: boolean = true;    // true if this funciton can be applied to an argument

  protected pushed: boolean = false;  // true if this object has already been pushed to the stack

  public ast: FuncName;               // sets the type of AST

  /**
   * Set up the applyData and the data about inverses
   */
  constructor(stack: Stack, value: string) {
    super(stack, value);
    this.applyData = {
      autoApply: this.autoApply,
      requireArgument: this.requireArgument || this.autoApply,
      args: this.args
    };
    if (this.isInvertible) {
      this.ast.inverse = this.invertAs(this.value);
    }
  }

  /**
   * If this funciton was already pushed, not further processing needed
   * Mark that we are pushed.
   * If the top is an operand, push a juxtaposition operator (implied multiplication).
   * Push this function followed by a pending function application operator.
   */
  public follows(top: Token): TokenArray {
    if (this.pushed) return [this];
    this.pushed = true;
    if (top.isa('Operand')) {
      this.stack.push(this.createToken('Juxtapose'));
    }
    return [this, this.createToken('ApplyPending', this)];
  }

  /**
   * Returns the name of the inverse function (can be overridden)
   */
  public invertAs(name: string) {
    return 'a' + name;
  }

}

/*****************************************************************************/

/**
 * The ApplyOp, ApplyArgument, ApplyPending, and Apply base classes and their defaults
 */
Operator.define('apply', {precedence: 3.5, associativity: 'right', astClass: 'FuncApply'}, ApplyOp);
ApplyOp.define('apply', {precedence: 1000}, ApplyArgument);
Token.define('apply-pending', {precedence: 3.5, associativity: 'right'}, ApplyPending);
Operand.define('function', {
  astClass: 'FuncName',
  args: 1,                   // number of arguments (Infinity means any number)
  autoApply: false,          // true if parentheses not required for funciton call
  requireArgument: true,     // true if argument must be present
  isInvertible: false        // true if function has an inverse function
}, Apply);
