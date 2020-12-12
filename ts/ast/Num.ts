import {AstLeaf} from './Node';

/**
 * Node vontaining a numeric value.
 */
export class Num extends AstLeaf {

  public static kind: string = 'Num';

  /**
   * Parse the value as a number
   */
  constructor(value: string) {
    super(parseFloat(value));
  }

}
