import {Token, TokenArray} from './Token';

/******************************************************************************/

/**
 *  The base operand class (for variables, numbers, etc.)
 */
export class Operand extends Token {

  /**
   * If the top is not an operand, push this token on the stack with no additional action.
   * Otherwise (it is an operand), create a juxtapose object
   * which will be either implied multiplication or function application)
   * and push that on the stack, then push this token (so that the justapose
   *   with operate on it by it's followedBy() or we get called again
   *   with the top being that juxtaposition).
   */
  public follows(top: Token): TokenArray {
    if (!top.isa('Operand')) return [this];
    this.stack.push(this.createToken('Juxtapose'));
    this.stack.push(this);
    return [];
  }

}

/**
 * Define the operand class which is not a function by default,
 *   and produces Name AST nodes.
 */
Token.define('operand', {canApply: false, astClass: 'Name'}, Operand);
