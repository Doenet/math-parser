import {AstVisitor} from './ast/Visitor';
import {AstObject} from './ast/Node';
import * as Base from './ast/BaseObjects';

/**
 * This is an AST visitor that converts the object-based AST
 *   to the original array-based AST format.  It is mainly an
 *   example of an AstVisitor and hoe one can be defined, and
 *   it may not be exactly what the original array-based form
 *   needs, but could be extended to be more accurate.
 *
 * The methods below tell what to do with each of the internal
 *   AST node classes (e.g., a Name node or a Num node).  The
 *   visitDefault() method handles any that aren't explicitly
 *   given.
 */

export class AstArrayVisitor extends AstVisitor {

  /**
   * The strings to use for the various relations
   */
  public multiRel: {[name: string]: string} = {'<': 'lts', '>': 'gts'};

  /**
   * A Name node returns just is name
   */
  public visitNameNode(node: Base.Name) {
    return node.value;
  }

  /**
   * A Num node returns just its number
   */
  public visitNumNode(node: Base.Num) {
    return node.value;
  }

  /**
   * A MultiRel node returns a relation array,
   *   e.g., [ 'lts', [ 'tuple', 'x', 'y', 'z' ], [ 'tuple', true, false ] ]
   *   for 'x <= y < z'
   */
  public visitMultiRelNode(node: Base.MultiRel) {
    const array = this.visitDefault(node);
    array[0] = 'tuple';
    if (node.relations.indexOf('=') >= 0) {
      throw Error('Can\'t translate ' + node);
    }
    const tuple = ['tuple', ...(node.relations.map((c) => c.length === 2))];
    return [this.multiRel[node.value] || node.value, array, tuple];
  }

  /**
   * A FuncExp (function expression) returns an apply array
   *   e.g., [ 'apply', [ '^', 'sin', 2 ], 'x' ] for 'sin^2(x)'
   */
  public visitFuncExpNode(node: Base.FuncExp) {
    const array = ['apply', this.visitNode(node.exp)];
    for (const child of node.childNodes) {
      array.push(this.visitNode(child));
    }
    return array;
  }

  /**
   * A Group node returns a comma list
   *   e.g., [ ',', 'x', 'y', 'z' ] for 'x, y, z'
   */
  public visitGroupNode(node: Base.Group) {
    const array = this.visitDefault(node);
    if (array[0] === 'group') {
      if (array.length === 2) return array[1];
      array[0] = ',';
    }
    return array;
  }

  /**
   * The default action is to make an array from the node's value or kind
   *   followed by the AST arrays for the node's children.
   */
  public visitDefault(node: AstObject) {
    const array = [node.value || node.kind.toLowerCase()];
    for (const child of node.childNodes) {
      array.push(this.visitNode(child));
    }
    return array;
  }

}
