import {Stack} from '../Stack';
import {AstObject} from '../ast/Node';

/**
 * Shortcut types
 */
export type TokenArray = Token[];
export type TokenClass = typeof Token;
export type AST = AstObject;

/**
 * Function Application data
 */
export type ApplyData = {
  args: number;               // number of arguments to the function
  requireArgument: boolean;   // whether we require an argument (true) or allow function formula (false)
  autoApply: boolean;         // whether parentheses are required (false) or not (true)
};

/******************************************************************************/

/**
 * This is the base class for all the token classes that the parser can accept
 */

export class Token {

  /**
   * The kind of token (e.g., operator, identifier, delimiter, etc.).
   */
  public static kind: string;

  /**
   * The strings that produce tokens of this class (can be more than one,
   * for items that work the same).
   */
  public token: string | string[] | null;

  /**
   * The pattern to use for this token, if it is not given by the token
   * strings above (e.g., numbers are given by a pattern for numbers,
   * or variable names can be given by a pattern).
   */
  public pattern: string | null;

  /**
   * The parser priority for this token class (so you can specify the order
   * in which patterns are recognized, e.g., a specific variable name could be
   * recognized before the generic variable-name pattern).
   */
  public priority: number;

  /**
   * A mapping of tokens to normalized token names, so multiple inputs
   * can produce the same output (e.g., different Unicode characters
   * could produce the same result, so U+002D and U+2212 could both be used
   * to produce "minus", or "alpha" and U+03B1 could both produce alpha.
   */
  public normalize: {[name: string]: string};

  /**
   * For tokens that all normalize to the same value, this is it (if null,
   * the map above is used).
   */
  public normalizeTo: string | null;

  /**
   * The normalized string that was parsed for this token.
   */
  public value: string;

  /**
   * The Abstract Syntax Tree for this token (which will contain
   * its children, for example).
   */
  public ast: AST;

  /**
   * The name of the AST object class associated with this token.
   */
  public astClass: string;

  /**
   * For function tokens, this will be data about the number of arguments
   * and whether it requires parentheses, and so on.
   */
  public applyData: ApplyData | null;

  /**
   * True if this token can be used as a function to apply to an argument.
   */
  public canApply: boolean;

  /**
   * A pointer to the parser stack that cotnains this token.
   */
  protected stack: Stack;

  /**
   * Get the token strings for this token class.
   */
  static get token() {
    return this.prototype.token;
  }

  /**
   * Get the pattern for this token class.
   */
  static get pattern() {
    return this.prototype.pattern;
  }

  /**
   * Get the priority for this token class.
   */
  static get priority() {
    return this.prototype.priority;
  }


  /******************************************************************************/

  /**
   * Create a subclass of the given class (or this class), giving it the
   * given kind and adding any new prototype properties.
   */
  public static define(kind: string, def: {[key: string]: any}, token?: TokenClass) {
    if (!token) {
      token = class extends this {};
    }
    token.kind = kind;
    Object.assign(token.prototype, def);
    return token;
  }

/******************************************************************************/

  /**
   * Create an instance of the class, using the argument as the value,
   * and creating the AST object needed for this token.
   */
  constructor(stack: Stack, ...args: any[]) {
    this.value = this.normalizeValue(args[0] as string);
    this.stack = stack;
    this.ast = this.createAst(this.astClass, this.value);
  }

  /**
   * Shorthad for accessing the token kind.
   */
  get kind() {
    return (this.constructor as typeof Token).kind;
  }

  /**
   * Return the AST for this token (can be overridden in subclasses
   * to handle more complicated tokens).
   */
  public tree(): AST {
    return this.ast;
  }

  /**
   * Use the normalization value or map to adjust the parsed
   * string that generates this token.
   */
  protected normalizeValue(value: string) {
    if (this.normalizeTo !== null) return this.normalizeTo;
    const name = value || this.kind;
    return (this.normalize[name] || name);
  }

  /**
   * Create an AST node using the class associated with the given class name
   * (the token class can specify the name using a propery ending with 'AstClass'
   * to specify the class), and using any arguments needed for the AST class.
   */
  protected createAst(type: string, ...args: any[]) {
    return this.stack.parser.createAst((this as any)[type + 'AstClass'] || type, args);
  }

  /**
   * Create a token node using the class associated with the given class name
   * (the token class can specify the name using a propery ending with 'Class'
   * to specify the class), and using any arguments needed for the AST class.
   * For example, if the token class has a property 'groupClass', then
   * createToken('group') would create a node from the class held in that property.
   * This allows classes to override the main token classes with subclasses, if needed.
   * That way, methods on the parent class that create tokens will create the
   * types specified by the child class (without having to override all the parent
   * methods that create token instances).
   */
  public createToken(type: string, ...args: any[]) {
    return this.stack.parser.createToken((this as any)[type + 'Class'] || type, args);
  }

  /**
   * Shorthand for checking if an instance is of a given named class (or a subclass of it).
   */
  public isa(type: string): boolean {
    return this.stack.parser.isa(type, this);
  }

  /**
   * Shorthand for checking if an AST instances is of a given named AST class (or a subclass of it).
   */
  public isast(type: string, node: AstObject): boolean {
    return this.stack.parser.isast(type, node);
  }

  /**
   * Share the function application data from a given token (no need to copy it, in general).
   */
  public copyApplyDataTo(token: Token) {
    token.applyData = this.applyData;  // shared copy; use use {...this.applyData}; for private data
  }

  /******************************************************************************/

  /**
   * Append a child node to the token (add the child's tree to this nodes AST,
   * and check the node's function data, if any).
   */
  public append(token: Token) {
    this.ast.append(token.tree());
    this.saveFunction(token);
    return token;
  }

  /**
   * If the token has function data and we are allowed to apply to an argument,
   *   If we already have data about arguments (e.g., we are a function formula)
   *     Check if the function data agrees with the token's data and error if not.
   *   Otherwise save the token's function data.
   * Otherwise, if the token is no a function token
   *   Mark that we can no longer be a function, and remove any function data.
   */
  protected saveFunction(token: Token) {
    if (token.applyData && this.canApply) {
      if (this.applyData) {
        if (!this.checkFunction(token)) {
          this.error('Functions are not compatible types for ' + this.value);
        }
      } else {
        token.copyApplyDataTo(this);
      }
    } else if (!token.canApply) {
      this.canApply = false;
      this.applyData = null;
    }
  }

  /**
   * Check that the token's funciton data is compatible with our data.
   * (i.e., that the values of the function properties are all the same,
   *  and that the number of arguments are compatible).
   */
  protected checkFunction(token: Token) {
    const tokenData = token.applyData as ApplyData;
    const thisData = this.applyData as ApplyData;
    for (const id of Object.keys(thisData) as (keyof ApplyData)[]) {
      const value1 = thisData[id];
      const value2 = tokenData[id];
      if (value1 !== value2) {
        if (id === 'args' && (value1 === Infinity || value2 === Infinity)) {
          if (value2 !== Infinity) thisData.args = value2 as number;
        } else {
          return false;
        }
      }
    }
    return true;
  }

  /******************************************************************************/

  /**
   * The default method for how to respond to the top token on the stack
   * (we simply append ourself onto the stack, regardless of the top node)
   */
  public follows(_top: Token): TokenArray {
    return [this];
  }

  /**
   * The default method for what to do with the token that follows us
   * (we do nothing and let that token handle us instead).
   */
  public followedBy(_token: Token): TokenArray | null {
    return null;
  }

  /**
   * The default method for how to handle a group that is being closed
   * (we pop ourself and append us to the top item on the stack).  This
   * should cause pending operations to be resolved.
   */
  public group(_item: Token) {
    this.stack.pop();
    this.stack.top().append(this);
    return false;
  }

  /******************************************************************************/

  /**
   * Shorthand for generating an error message.
   */
  public error(message: string) {
    this.stack.parser.error(message);
  }

}

/**
 *  Set the default values for the base token class.  Everything else
 *  is a subclass of this.
 */
Token.define('token', {
  canApply: true,
  priority: 10,
  astClass: 'base',
  normalize: {},
  normalizeTo: null
}, Token);
