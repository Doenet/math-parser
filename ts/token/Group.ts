import {Stack} from '../Stack';
import {Token} from './Token';
import {Tree} from './Tree';

import {Group as AstGroup} from '../ast/Group';

/**
 * The generic class for delimited groups.
 */
export class Group extends Tree {

  public open: string;      // the open delimiter string
  public close: string;     // the close delimiter string
  public isApply: boolean;  // true if these could form function application

  public ast: AstGroup;     // declare the type of AST object used

  /**
   * Save the open and close delimiters, and whether it can be a function
   * application group.
   */
  constructor(stack: Stack, open: string, close: string, token: Token) {
    super(stack, token);
    this.ast.open = this.open = open;
    this.ast.close = this.close = close;
    this.isApply = (token as any).isApply;
  }

  /**
   * True if these can form a function argument.
   */
  get isApplyGroup() {
    return (this.open === '(' && this.close === ')');
  }

}

/**
 * Declare the group token with no default open and close strings.
 */
Tree.define('group', {open: '', close: ''}, Group);
