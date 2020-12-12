import {Stack} from '../Stack';
import {Token} from './Token';
import {Operand} from './Operand';

/**
 * A generic parsed AST tree node
 */
export class Tree extends Operand {
  constructor(stack: Stack, token: Token) {
    super(stack);
    this.ast = token.tree();
    this.saveFunction(token);
  }
}
Operand.define('tree', {canApply: true}, Tree);
