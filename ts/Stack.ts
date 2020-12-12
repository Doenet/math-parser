import {Token} from './token/Token';
import {Delimiter} from './token/Delimiter';
import {Parser} from './Parser';

/******************************************************************************/

/**
 * This is the stack object for the parser.  It manages negotiations between
 * the stack items about what should be done as a new stack item is pushed
 * on the stack.
 */
export class Stack {

  /**
   * The Parser object that is using this stack.
   */
  public parser: Parser;

  /**
   * The items on the stack.
   */
  protected stack: Token[] = [];

  /**
   * Construct the stack and save the parser using it.
   */
  constructor(parser: Parser) {
    this.parser = parser;
  }

  /**
   * Return the top item on the stack.
   */
  public top() {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Push a new item onto the stack.
   * First ask the top item on the stack it it wants to handle the new item,
   *   and if not, as the token how it wants to handle the top item.
   *   We will get an array (possibly empty) of new items to be pushed on the stack.
   *   These could be the token itself, or something else, depending on the
   *   interactions between the top and new tokens.  That interaction could include
   *   poping items off the stack, and providing new ones to push.
   */
  public push(token: Token) {
    const top = this.top();
    const items = (top ? top.followedBy(token) : null) || token.follows(this.top());
    for (const item of items) {
      this.stack.push(item);
    }
  }

  /**
   * Pop (and return) the top item from the stack.
   */
  public pop() {
    return this.stack.pop();
  }

  /**
   * Remove all items from the stack.
   */
  public clear() {
    this.stack = [];
  }

}

/**
 * This is a class for the start and stop items for the stack (which act as delimiters
 *   so that when the end item is pushed, it will cause any pending operations to be
 *   processed, just like a close parentheses does).
 */
class StackDelimiter extends Delimiter {
  public tree() {
    return this.ast.childNodes[0];
  }
}

/**
 * These are the start and stop delimiters that contain the fully parsed expression.
 */
export const Start = StackDelimiter.define('_start_', {close: ['_end_'], allowEmpty: true, astClass: 'StackGroup'});
export const End = StackDelimiter.define('_end_', {isClose: true, astClass: 'StackGroup'});
