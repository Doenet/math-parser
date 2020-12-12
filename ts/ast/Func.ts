import {AstNode, AstObject} from './Node';
import {Name} from './Name';

import {Parser} from '../Parser';

/*******************************************************************************/

/**
 * The node for a named function with no arguments
 */
export class FuncName extends Name {

  public static kind: string = 'FuncName';

  public inverse: string;   // the name of the inverse of this function, if any

}
FuncName.defaults({inverse: ''});


/*******************************************************************************/

/**
 * The node for a named function applied to arguments
 */
export class FuncApply extends AstNode {

  public static kind: string = 'FuncApply';

  public autoApply: boolean;      // true if arguments don't need parentheses

  /**
   * Returns the name of the function
   */
  get name() {
    return this.value;
  }

  /**
   * The function's arguments
   */
  get args() {
    return this.childNodes;
  }

  /**
   * Stringify as name(arguments)
   */
  public toString() {
    return this.name + '(' + this.args.join(', ') + ')';
  }
}
FuncApply.defaults({autoApply: false});


/*******************************************************************************/

/**
 * The node for a funciton expression applied to arguments
 */
export class FuncExp extends FuncApply {

  public static kind: string = 'FuncExp';

  public precedence: number;    // the precedence of the top-level operator in the expression

  public exp: AstObject;        // the AST for the function expression

  /**
   * Get the expression from the JSON and then create the rest of the JSON
   */
  public static fromJSON(parser: Parser, json: any) {
    if (json.exp) {
      json.exp = parser.fromJSON(json.exp);
    }
    return super.fromJSON(parser, json);
  }

  /**
   * Create the node from the expression, args, and other data.
   */
  constructor(exp: AstObject, args: AstObject[], autoApply: boolean, precedence: number) {
    super('', args);
    this.exp = exp;
    if (autoApply !== this.autoApply) {
      this.autoApply = autoApply;
    }
    if (precedence !== this.precedence) {
      this.precedence = precedence;
    }
  }

  /**
   * Stringify as (expression)(arguments)
   */
  public toString() {
    return this.addParens(this.exp, this.precedence) + '(' + this.args.join(', ') + ')';
  }

  /**
   * Include the expression JSON in the resulting JSON object.
   */
  public toJSON() {
    const json = super.toJSON();
    (json as any).exp = this.exp.toJSON();
    return json;
  }

}
FuncExp.defaults({precedence: 3.5});
