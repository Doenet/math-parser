import {AstObject, AstNode} from './Node';

/**
 * The generic operator node
 */
export class Op extends AstNode {

  public static kind: string = 'Op';

  public precedence: number;         // the precedence of the operator
  public associativity: string;      // the associativity ('left' or 'right')
  public opString: string | null;    // the output string for the operator (or null to use its value)
  public equalParens: boolean;       // true to include parens when stringified with equal precedences
  public isComma: boolean;           // true if this is a list separator (comma)

  /**
   * returns the operator name
   */
  get operator() {
    return this.value;
  }

  /**
   * Returns operator name for string output
   */
  get operatorString(): string {
    return (this.opString as string) || (this.value as string) || '';
  }

  /**
   * Add parentheses if needed by the precedence
   */
  public addParens(node: AstObject, prec: number = this.precedence, equal: boolean = this.equalParens) {
    return super.addParens(node, prec, equal);
  }

}
Op.defaults({
  precedence: 0,
  associativity: 'left',
  opString: null,
  equalParens: false,
  isComma: false
});

/*****************************************************************************/

/**
 */
export class Bop extends Op {

  public static kind: string = 'Bop';

  /**
   * Get the left-hand operand
   */
  get lop() {
    return this.childNodes[0];
  }

  /**
   * Get the right-hand operand
   */
  get rop() {
    return this.childNodes[1];
  }

  /**
   * Get the operator string (either the given string, or spaces around the node's value)
   */
  get operatorString() {
    return (this.opString !== null ? this.opString : ' ' + (this.value as string) + ' ');
  }

  /**
   * Stringify the children separated by the operator
   */
  public toString() {
    return this.childNodes.map((child) => this.addParens(child)).join(this.operatorString);
  }

}

/*****************************************************************************/

/**
 */
export class Uop extends Op {

  public static kind: string = 'Uop';

  /**
   * Get the operand
   */
  get operand() {
    return this.childNodes[0];
  }

  /**
   * Stringify with the operand on the correct side of the operator
   */
  public toString() {
    const op = this.operatorString;
    const arg = this.addParens(this.operand);
    return (this.associativity === 'left' ? op + arg : arg + op);
  }

}
Uop.defaults({equalParens: true});
