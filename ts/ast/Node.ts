import {Parser} from '../Parser';


/**
 * The type of AstObject
 */
export type AstObjectClass = typeof AstObject;


/**
 * The base AST node object class
 */
export class AstObject {

  /**
   * The kind of the node
   */
  public static kind: string = 'base';

  /**
   * The string for the specific node (e.g., "+" for an Op node)
   */
  public value: string | number;

  /**
   * The child nodes of this node, if any
   */
  public childNodes: AstObject[];

  /**
   * Static method to assign defaults to the class prototype
   */
  public static defaults(values: Object) {
    Object.assign(this.prototype, values);
  }

  /**
   * State method for creating an instance of this class from a JSON object
   */
  public static fromJSON(_parser: Parser, json: any): AstObject {
    return Object.assign(Object.create(this.prototype), json);
  }

  /**
   * Create object with given value
   */
  constructor(...args: any[]) {
    this.value = (args[0] as string || '');
  }

  /**
   * Shorthand for accessing node kind
   */
  get kind() {
    return (this.constructor as typeof AstNode).kind;
  }

  /**
   * Append a child node (and return it)
   */
  public append(child: AstObject) {
    this.childNodes.push(child);
    return child;
  }

  /**
   * Service routine to add parentheses based on the precedence of the node
   *   compared to an external precedence (and whether to add if the precedences are equal).
   */
  public addParens(node: AstObject, precedence: number, equalParens: boolean = false): string {
    const text = node.toString();
    if (!('precedence' in node)) return text;
    const prec = (node as any).precedence;
    return (prec < precedence || (equalParens && prec === precedence) ? '(' + text + ')' : text);
  }

  /**
   * Stringify based on the value and its children.
   */
  public toString() {
    const children = this.childNodes.join(',');
    return (this.value ? this.value + (children ? '(' + children + ')' : '') : children);
  }

  /**
   * Create a JSON representation of the node and its children.
   */
  public toJSON() {
    const json: Object = Object.assign({kind: this.kind}, this);
    (json as any).childNodes = this.childNodes.map((child) => child.toJSON());
    return json;
  }

}

/*******************************************************************************/

/**
 * Basic AST node with children
 */
export class AstNode extends AstObject {

  public static kind: string = 'AstNode';

  public childNodes: (AstNode | AstLeaf)[] = [];  // set type of child nodes

  /**
   * Use the parser to generate the childNode JSON,
   * Then create the object from the modified JSON data.
   */
  public static fromJSON(parser: Parser, json: any) {
    if (json.childNodes) {
      json.childNodes = json.childNodes.map((child: any) => parser.fromJSON(child));
    }
    return super.fromJSON(parser, json);
  }

  /**
   * Assign the children to the created object
   */
  constructor(value: string, children: AstObject[] = []) {
    super(value);
    this.childNodes = children;
  }

}


/*******************************************************************************/

/**
 * Basic AST leaf node (no children)
 */
export class AstLeaf extends AstObject {

  public static kind: string = 'AstLeaf';

  /**
   * No children, so return an empty list
   */
  get childNodes() {
    return [];
  }

  /**
   * Stringify as the node's value
   */
  public toString() {
    return (typeof this.value === 'string' ? this.value : String(this.value));
  }

  /**
   * Create the JSON version of the object
   */
  public toJSON() {
    return Object.assign({kind: this.kind}, this) as Object;
  }

}
