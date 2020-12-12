import {Stack} from '../Stack';
import {Token, TokenArray, TokenClass} from './Token';

import {Bop, Uop} from '../ast/Op';

/**
 * The base Operator class (all other operators should subclass this
 */
export class Operator extends Token {

  public associativity: string;                  // 'left' or 'right'
  public precedence: number;                     // operator precedence
  public combine: boolean;                       // true if multiople operators can be combined into one node
  public appliesLeft: boolean;                   // true if this operator can have a function operator on the left
  public type: string;                           // 'binary', 'unary' or 'both'
  public isComma: boolean;                       // true if this is a comma-type operator (for lists)
  public opString: string;                       // string to use for toString() operations
  public opStrings: {[name: string]: string};    // translation of values to strings to use for toString()
  public equalParens: boolean;                   // include parens when used with operators of equal precedence

  public transferIds: string[];                  // The properties to transfer to the AST Op node

  public ast: Bop | Uop;                         // The AST node for this operator

  protected unaryClass: TokenClass | string;     // class for unary version when type === 'both'

  /**
   * Create the token instance, and copy and needed properties to its AST node.
   * Set the opString on the AST node, if there is one.
   */
  constructor(stack: Stack, value?: string) {
    super(stack, value);
    for (const id of this.transferIds) {
      if ((this.ast as any)[id] !== (this as any)[id]) {
        (this.ast as any)[id] = (this as any)[id];
      }
    }
    if (this.opStrings[this.value]) {
      this.ast.opString = this.opStrings[this.value];
    }
  }

  /**
   * True if the operator can preceed its operand.
   * Usually this is true for binary operands or unary ones that are prefix operands.
   * (Can be overriden in subclasses.)
   */
  get canPrecedeOperand() {
    return this.type === 'binary' || this.associativity === 'left';
  }

  /**
   * True if this can be a unary operator on the left.
   * Usually this is true for prefix unary operators (or ones that can be both).
   */
  get canBeLeftUnary() {
    return this.type !== 'binary' && this.associativity === 'left';
  }

  /**
   * Decide how to handle an operator based on what is before it on the stack.
   * If we should be a unary operator, return the unary operator to be pushed on the stack.
   * If the top is not an operand, give an error, otherwiwse pop it off the stack
   * Handle a preceding operator of higher precedence (and return if so).
   * Add the top token as a child of this one.
   * If the top is a function-type token, copy its argument data.
   * If we are a right-unary operator, handle that and return.
   * Otherwise push this operator on teh stack.
   */
  public follows(top: Token): TokenArray {
    if (this.checkLeftUnary(top)) return [this.makeUnary()];
    if (!(top.isa('Operand'))) {
      this.error(`Missing operand before ${this.value}`);
    }
    if (this.checkOperator(top)) return [];
    this.append(top);
    if (top.isa('Apply')) top.copyApplyDataTo(this);
    if (this.checkRightUnary(top)) return [];
    return [this];
  }

  /**
   * Pop the top of the stack
   * If the previous item is an operator of higher precedence than us,
   *   Append the top (operand) to the previous (operator)
   *   If we can be combined with the previous operator,
   *     Pop the previous operator, and push a Tree token for the previous operator
   *     Then push us onto the stack (the Tree will handle us)
   *   Return an empty list (meaning we have handled the top token);
   * Otherwise return ull (meaning we didn't handle the top token);
   */
  protected checkOperator(top: Token):  TokenArray | null {
    const stack = this.stack;
    stack.pop();
    let prev = stack.top();
    if (prev.isa('Operator') && this.checkIsHigherPrecedence(prev, top)) {
      prev.append(top);
      if (!this.canCombine(prev as Operator)) {
        stack.pop();
        stack.push(this.createToken('Tree', prev));
        stack.push(this);
      }
      return [];
    }
    return null;
  }

  /**
   * Check if a token has higher precedence than we do
   * (overridden verion for Apply needs the top token as well to decide)
   */
  protected checkIsHigherPrecedence(prev: Token, _top: Token) {
    return (prev as Operator).precedence > this.precedence ||
      ((prev as Operator).precedence === this.precedence && this.associativity === 'left');
  }

  /**
   * Check if we should be a unary operator on the left
   * (e.g., we follow an open delimiter).
   */
  protected checkLeftUnary(top: Token) {
    return this.checkIsLeftUnary(top);
  }

  /**
   * Return true if we should be a unary operator on the left
   * (i.e., we are left-associative and either unary, or can be unary
   *  and are not preceded by an operand).
   */
  protected checkIsLeftUnary(top: Token) {
    return this.associativity === 'left' &&
      (this.type === 'unary' || (this.type === 'both' && !(top.isa('Operand'))));
  }

  /**
   * Check if we should be a unary operator on the right, and if so
   * push a Tree token with the unary operator onto the stack.
   */
  protected checkRightUnary(top: Token) {
    if (this.checkIsRightUnary(top)) {
      this.stack.push(this.createToken('Tree', this.makeUnary()));
      return true;
    }
    return false;
  }

  /**
   * Return true if we should be a unary operator on the right
   * (i.e., we are right associative and either unary, or can
   *  be unary and the top token isn't an operator, meaning there
   *  is an operand on the stack that we can apply to).
   */
  protected checkIsRightUnary(top: Token) {
    return this.associativity === 'right' &&
      (this.type === 'unary' || (this.type === 'both' && !top.isa('Operator')));
  }

  /**
   * Return true if we can be combined with the previous operator
   * (e.g., for x + y + z forming a single '+' node with three children).
   */
  public canCombine(prev: Operator) {
    return prev.value === this.value && this.combine && prev.type !== 'unary';
  }

  /**
   * Create the unary form for this token (either the token itself,
   * or the specified unary class if we can be both binary or unary).
   */
  public makeUnary(): Token {
    return (this.type === 'unary' ? this : this.createToken('unary', this.value));
  }

  /**
   * When a delimiter closes the group, check that we have the proper
   * number of operands and report an error if not, otherwise
   * do the usual group-closing function.
   */
  public group(item: Token) {
    if (!this.checkOperands()) {
      this.error('Missing operand following ' + this.ast.value);
    }
    return super.group(item);
  }

  /**
   * Check that we have the proper number of children in our tree.
   */
  protected checkOperands() {
    return (this.ast.childNodes.length >= 2 || (this.type === 'unary' && this.ast.childNodes.length === 1));
  }

}

/**
 * The defaults for generic operators
 */
Token.define('operator', {
  associativity: 'left',
  precedence: 5,
  combine: false,
  appliesLeft: false,
  type: 'binary',
  isComma: false,
  unaryClass: '',
  equalParens: false,
  opString: null,
  opStrings: {},
  transferIds: ['associativity', 'precedence', 'isComma', 'equalParens', 'opString']
}, Operator);


/**
 * The generic Binary operator class
 */
export class BinaryOp extends Operator {
  public ast: Bop;
}
Operator.define('binary', {type: 'binary', astClass: 'Bop'}, BinaryOp);

/**
 * The generic Unary operator class
 */
export class UnaryOp extends Operator {
  public ast: Uop;
}
Operator.define('unary', {type: 'unary', astClass: 'Uop', equalParens: true}, UnaryOp);

/**
 * The implied multiplication operator
 */
export const Juxtapose = BinaryOp.define('*', {precedence: 2, combine: true, opString: ' '});
