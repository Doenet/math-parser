import {AstLeaf} from './Node';

/**
 * Generic named object node (function, variable, constant, etc.)
 */
export class Name extends AstLeaf {

  public static kind: string = 'Name';

}
