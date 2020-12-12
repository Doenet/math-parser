import {Stack} from '../Stack';
import {BinaryOp} from './Operator';

/**
 * Single operator to multi-relation name map
 */
export type CombinedMap = {[name: string]: string};

/**
 * The generic Relation (and multi-relation) class (a binary operator)
 */
export class Relation extends BinaryOp {

  /**
   * Maps single operators to their multi-relation names.
   */
  public combined: CombinedMap;

  /**
   * The generic type of relation (e.g., '<')
   */
  public type = '';

  /**
   * The relations goining the children (e.g., ['<', '=', '<='] for 'x < y = z <= 5')
   */
  public list: string[];

  /**
   * Set the list and type to the initial relation (can be changed later)
   */
  constructor(stack: Stack, value: string) {
    super(stack, value);
    this.list = [this.value];
    this.type = this.value;
  }

  /**
   * Check to see if this token can combine with the previous one on the stack.
   * (designed for inequalities, so would need to be made more generic for
   *  other types of relations, like subsets).
   */
  public canCombine(prev: Relation) {
    const can = this.combine && prev.isa('Relation') &&
      (prev.type === '=' || (this.value === '=' || prev.type.charAt(0) === this.value.charAt(0)));
    if (can) {
      prev.list.push(this.value);
      if (prev.type === '=') {
        prev.type = this.value.charAt(0);
      }
    }
    return can;
  }

  /**
   * Make the AST tree either from the relation itself, or as a MultiRel node.
   */
  public tree() {
    if (this.ast.childNodes.length <= 2) return super.tree();
    const type = this.type;
    return this.createAst('MultiRel', this.combined[type] || type, this.ast.childNodes, this.list, this.opStrings);
  }
}

BinaryOp.define('relation', {
  precedence: .75,
  combine: true,
  combined: {},
  opStrings: {},
  astClass: 'Rel'
}, Relation);
