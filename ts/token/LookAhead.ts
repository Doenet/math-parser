import {Stack} from '../Stack';
import {Token, TokenArray, TokenClass} from './Token';
import {Operator} from './Operator';


/**
 * The LookAhead class that puts of determining how to handle a token
 *   until later tokens determine how it should be processed.
 *   (e.g., Is | an absolute value or a set "such that"?  Is a < for less-than or a vector delimiter?)
 * We determine between whether this is a delimiter or an operator token by looking for a close
 *   token with a given string.
 */

export class LookAhead extends Token {

  protected close: string;                          // string for the close token
  protected operatorClass: TokenClass | string;     // class to use when this is an operator (name or class)
  protected delimiterClass: TokenClass | string;    // class to use when this is a delimiter (name or class)

  protected saved: Token[];    // The tokens saved when looking ahead for the close token

  /**
   * Initialize the saved token array.
   */
  constructor(stack: Stack, value?: string) {
    super(stack, value);
    this.saved = [];
  }

  /**
   * Pop the look-ahead off the stack
   * Push the token of the proper tyoe (operator or delimiter)
   * Then push all the saved tokens (performing their usual actions)
   * Clear the saved stack to free up memory
   */
  protected unravel(item: string, isClose: boolean = false) {
    const stack = this.stack;
    stack.pop();
    stack.push(this.createToken(item, undefined, isClose));
    for (let token of this.saved) {
      stack.push(token);
    }
    this.saved = [];
  }

  /**
   * Check the next token to see how to process it.
   * If the check returns a TokenArray or null, return that
   *   (so either tokens to push on the stack, or the token should be processed as normal (null))
   * If the token is an instance of ourself, do the followedBySelf() method
   * Otherwise save the token for later processing (continue look ahead).
   */
  public followedBy(token: Token) {
    const check = this.followedByCheck(token);
    if (check !== undefined) return check;
    if (token instanceof this.constructor) {
      return this.followedBySelf(token);
    }
    this.saved.push(token);
    return [];
  }

  /**
   * If the next token is a delimiter, process it, otherwise let it be saved for later.
   * (This can be overridden in child classes.)
   */
  protected followedByCheck(token: Token): TokenArray | null | undefined {
    return (token.isa('Delimiter') ? null : undefined);
  }

  /**
   * This is called when we hit a token of our own class (it may be the close delimiter).
   * If we have saved elements,
   *  Get the last one saved, and check if it is an operator that can preceed an operand
   *  If not, unravel the saved tokens with us as delimiters around the saved tokens
   * Otherwise, process the token (start another look-ahead).
   */
  protected followedBySelf(token: Token) {
    if (this.saved.length) {
      const top = this.saved[this.saved.length - 1];
      if (!(top.isa('Operator') && (top as Operator).canPrecedeOperand)) {
        this.unravel('delimiter', false);
        this.stack.push(this.createToken('delimiter', this.close, true));
        return [];
      }
    }
    return [token];
  }

  /**
   * When a we hit the end of a group,
   *   If there are saved tokens, make us an operator and push the saved tokens again,
   *   Otherwise give an error message about the missing operand
   */
  public group(_item: Token) {
    if (this.saved.length) {
      this.unravel('operator');
    } else {
      this.error(`Missing operand after ${this.value}`);
    }
    return false;
  }

}

/**
 * Generic look-ahead base class
 */
Token.define('look-ahead', {
  close: '',             // the string for the close token
  operatorClass: '',     // the class for when this is an operator (name or class)
  delimiterClass: ''     // the class for when this is a delimiter (name or class)
}, LookAhead);
