import {AstObject} from './Node';
import {Bop} from './Op';

/**
 * A Rel node for a relation
 */
export class Rel extends Bop {

  public static kind: string = 'Rel';

}

/**
 * A MultiRel node for chained relations (e.g., "x < y <= z")
 */
export class MultiRel extends Rel {

  public static kind: string = 'MultiRel';

  public relations: string[];                    // the relations between the children nodes
  public opStrings: {[name: string]: string};    // the strings to use when stringifying the operators
                                                 //  (e.g., could map "<=" to U+2264, etc.)

  /**
   * Create the object and save the defining values.
   */
  constructor(value: string, children: AstObject[], relations: string[], opStrings: {[name: string]: string}) {
    super(value, children);
    this.relations = relations;
    if (Object.keys(opStrings).length) {
      this.opStrings = opStrings;
    }
  }

  /**
   * Stringify using the opString values between the string versions of the children.
   */
  public toString() {
    const child = this.childNodes;
    const items: string[] = [child[0].toString()];
    for (let i = 1; i < child.length; i++) {
      items.push(this.getOp(this.relations[i - 1]));
      items.push(child[i].toString());
    }
    return items.join(' ');
  }

  /**
   * Get the operator strings from the opString array, or use the literal name if not there.
   */
  protected getOp(name: string) {
    return (this.opStrings.hasOwnProperty(name) ? this.opStrings[name] : name);
  }

}
MultiRel.defaults({opStrings: {}});
