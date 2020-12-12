import {AstObject} from './Node';
import {Parser} from '../Parser';

/**
 * The type for node vistor functions
 */
export type AstVisitorFunction = (node: AstObject, ...args: any[]) => any;

/**
 * The generic AST tree visitor
 */
export class AstVisitor {

  /**
   * The parser to use for this visitor
   */
  public parser: Parser;

  /**
   * The internal list of node handlers, and the default handler
   */
  protected nodeHandlers: Map<string, AstVisitorFunction>;
  protected defaultHandler: AstVisitorFunction;

  /**
   * Save the parser and create the handlers
   */
  constructor(parser: Parser) {
    this.parser = parser;
    this.setHandlers();
  }

  /**
   * Look through the nodes in the the parser AST node map
   *   If there is a visitor method for the node kind,
   *     Add a node handler for the visitor method
   * Create the default handler.
   */
  public setHandlers() {
    this.nodeHandlers = new Map();
    for (const kind of this.parser.astMap.keys()) {
      let method = this[this.methodName(kind)];
      if (method) {
        this.nodeHandlers.set(kind, method.bind(this));
      }
    }
    this.defaultHandler = this.visitDefault.bind(this);
  }

  /**
   * Return the method name for a given node kind
   */
  protected methodName(kind: string): string {
    return 'visit' + kind.replace(/[^a-z0-9_]/ig, '_') + 'Node';
  }

  /**
   * Visit an AST tree, with arbitrary arguments
   */
  public visit(node: AstObject, ...args: any[]) {
    return this.visitNode(node, ...args);
  }

  /**
   * Visit an AST node and its subtree:
   *   Look through the node's prorotype chain for a class that has a handler.
   *   Call the handler or the default handler on the given node (with the given arguments).
   */
  public visitNode(node: AstObject, ...args: any[]) {
    let handler: AstVisitorFunction | undefined;
    let NODE = (node as any).__proto__ as AstObject;
    while (!handler && (NODE instanceof AstObject)) {
      handler = this.nodeHandlers.get(NODE.kind);
      NODE = (NODE as any).__proto__ as AstObject;
    }
    return (handler || this.defaultHandler)(node, ...args);
  }

  /**
   * The default node visitor:
   *   Visit each child of the node with the given arguments
   */
  public visitDefault(node: AstObject, ...args: any[]) {
    for (const child of node.childNodes) {
      this.visitNode(child, ...args);
    }
  }

  /**
   * Allow other handlers
   */
  [handler: string]: any;

}
