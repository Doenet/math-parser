import {Token} from './Token';
import {LookAhead} from './LookAhead';
import {Operator} from './Operator';
import {Relation} from './Relation';
import {Delimiter} from './Delimiter';

/**
 * The class to implement < as both less than and vector brackets
 */

export class Angle extends LookAhead {

  public token: string[];      // The open and close token

  public isOpen = false;       // True when angle can be an open delimiter
  public hasComma = false;     // True when the angle is followed by a comma
  public isClosed = false;     // True if this delimiter has been closed

  /**
   * If this is the open delimiter (<), then
   *   If we follow a delimiter or we follow an operator that can precede an operand,
   *     Then consider this an open delimiter.
   *   Push this look-ahead token to decide how to handle it in the future.
   * Otherwise create an operator (rather than a delimiter) and push that.
   */
  public follows(token: Token) {
    if (this.value === this.token[0]) {
      if (token.isa('Delimiter') ||
          (token.isa('Operator') && (token as Operator).canPrecedeOperand)) {
        this.isOpen = true;
      }
      return [this];
    }
    this.stack.push(this.createToken('operator', this.value));
    return [];
  }

  /**
   * If the following token closes us as an open delimiter, do that.
   * Otherwise, if the following token is a delimiter, process it
   * Otherwise, if the following token is an operator, check if it affects us
   * Otherwise, keep looking
   */
  public followedByCheck(token: Token) {
    if (this.checkIsClosed(token)) return [];
    if (token.isa('Delimiter')) return null;
    if (token.isa('Operator')) {
      this.checkOperator(token);
    }
    return undefined;
  }

  /**
   * If we are already closed, return false
   * If the following token is an operator
   *   Unravel the saved stack pushing the open token as an operator
   *   Push the close token as an operator
   * Otherwise
   *   Unravel the saved stack pushing the open token as a delimiter
   *   Push the close token as a delimiter
   * Push the following token again, and indicate we are closed
   */
  protected checkIsClosed(token: Token) {
    if (!this.isClosed) return false;
    if (this.isOperator(token)) {
      this.unravel('operator', false);
      this.stack.push(this.createToken('operator', this.token[1], true));
    } else {
      this.unravel('delimiter', false);
      this.stack.push(this.createToken('delimiter', this.token[1], true));
    }
    this.stack.push(token);
    return true;
  }

  /**
   * The angle is an operator if the following token is an operand and we have processed a comma
   *   and we are not able to be an open delimiter.
   */
  protected isOperator(token: Token) {
    return (token.isa('Operand') && this.hasComma && !this.isOpen);
  }

  /**
   * If the operator is a comma, record that fact
   */
  protected checkOperator(token: Token) {
    if (token.value === ',') {
      this.hasComma = true;
    }
  }

  /**
   * If we are followed by another open angle, stack it,
   * Otherwise (it is a close angle), mark us as closed
   *   and don't stack anything.
   */
  protected followedBySelf(token: Token) {
    if (token.value === this.token[0]) {
      return [token];
    }
    this.isClosed = true;
    return [];
  }

}

/**
 * Special handling of < and > when both inequalities and vectors are supported.
 */
LookAhead.define('angle', {
  token: ['<', '>'],
  operatorClass: Relation.define('<', {}),
  delimiterClass: Delimiter.define('<', {close: ['>'], GroupAstClass: 'Vector'})
}, Angle);
