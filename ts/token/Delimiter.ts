import {Stack} from '../Stack';
import {Token} from './Token';

import {Op} from '../ast/Op';

/**
 * The base Delimiter token class.
 */
export class Delimiter extends Token {

  public allowEmpty: boolean;       // true if delimiters can be emtpy (e.g., for empty set or empty list)
  public close: string[];           // strings that can be close delimiters for this one
  public groupType: string;         // name of class that these delimiters enclose (e.g., 'abs' for absolute values)
  public removable: boolean;        // true if the delimiters can be discarded (like parens used to override precedence)
  public removePrecedence: number;  // precedence of contained operator above which delimiters can be removed
  public isApply: boolean;          // true if these represent function application

  public isClose: boolean;          // true when this is a close delimiter

  /**
   * Set the isClose value when created
   */
  constructor(stack: Stack, value?: string, isClose?: boolean) {
    super(stack, value);
    this.isClose = this.checkIfClose(isClose);
  }

  /**
   * Determines whether to mark this as a close delimiter.
   * If there is class-asigned value, use it.
   * If the parameter is specified, use it.
   * if the string used to create this token is the same as its kind, then NOT closed.
   * Otherwise, check if we are closed by a tokne of our own kind.
   */
  protected checkIfClose(isClose?: boolean) {
    if (this.isClose !== undefined) return this.isClose;
    if (isClose !== undefined) return isClose;
    if (this.value === this.kind) return false;
    return this.isClosedBy(this);
  }

  /**
   * Report an error if the tree is empty when that is not allowed.
   * If the delimiters can be removed, do so, otherwise return the full tree.
   */
  public tree() {
    let tree = this.ast;
    if (tree.childNodes.length === 0 && !this.allowEmpty && !this.isClose) {
      this.error('Empty delimiters not allowed');
    }
    return (this.canBeRemoved() ? tree.childNodes[0] : tree);
  }

  /**
   * Delimiters can be removed if the class allows that, and there is only one child in the tree,
   *   and that child either is not an operator, or it is an operator with precedence that
   *   is higher than the removal precedence.  (E.g., parens may not be removed if they contain
   *   a comma-separated list, but can be removed around a sum.)
   */
  protected canBeRemoved() {
    const children = this.ast.childNodes;
    return (this.removable && children.length === 1 &&
            (!this.isast('Op', children[0]) || (children[0] as Op).precedence > this.removePrecedence));
  }

  /**
   * Check if a token is one of the close tokens for this class
   */
  protected isClosedBy(item: Token) {
    return this.close.indexOf(item.value) >= 0;
  }

  /**
   * If the token closing the group is a close token for this delimiter,
   *   If this is not the expression's Start token,
   *     Pop the delimiter.
   *     Push the content of the group (if the delimiters can be removed).
   *       or the group with its delimiters otherwise.
   *     If the content is a function object, push an ApplyPending operator
   *       (so we can process the argument if there is one).
   *   return true (stop closing the group).
   * Otherwise, if this is the expression's Start delimiter, give an error.
   * Otherwise, if the close delimiter is the expression's End delimiter, give an error.
   * Otherwise, indicate the mismatched delimiters.
   */
  public group(item: Token) {
    if (this.isClosedBy(item)) {
      if (!this.isa('Start')) {
        this.stack.pop();
        this.stack.push(this.canBeRemoved() ?
                        this.createToken('Tree', this) :
                        this.createToken('Group', this.value, item.value, this));
        if (this.applyData) {
          this.stack.push(this.createToken('ApplyPending', this));
        }
      }
      return true;
    }
    if (this.isa('Start')) {
      this.error(`Missing open delimiter for '${item.value}'`);
    } else if (item.isa('End')) {
      this.error(`Missing close delimiter for '${this.value}'`);
    }
    this.error(`Mismatched delimiters: '${this.value}' and '${item.value}'`);
    return false;
  }

  /**
   * If we are not a close token, push us onto the stack
   * Otherwise, loop through the token on the top of the stack
   *   and ask them to close themselves until one returns true
   *   (indicating that it is the open token that this one closes)
   * If no open token for this one is found, produce an error.
   */
  public follows(top: Token) {
    if (!this.isClose) return [this];
    while (top) {
      if (top.group(this)) return [];
      top = this.stack.top();
    }
    this.error(`Extra close delimiter: ${this.value}`);
    return [];
  }

}

/**
 * The generic Delimiter base class
 */
Token.define('delimiter', {
  allowEmpty: false,     // true if the group can be empty
  close: [],             // the token strings that close this group
  astClass: 'Group',     // the AST class to use for the group (e.g., vector)
  removable: false,      // true if should not form group with just one item
  removePrecedence: -1,  // remove when above this precedence
  isApply: false         // true if these form function application
}, Delimiter);
