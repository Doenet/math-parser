import {Stack} from './Stack';
import {Token, TokenClass} from './token/Token';
import {AstNode, AstObject, AstObjectClass} from './ast/Node';
import * as BaseTokens from './token/BaseTokens';
import * as BaseAst from './ast/BaseObjects';

/**
 * Collections of named token classes
 */
export type TokenList = {[name: string]: TokenClass};
export type TokenMap = Map<string, TokenClass>;

/**
 * Collections of named AST object classes
 */
export type AstList = {[name: string]: AstObjectClass};
export type AstMap = Map<string, AstObjectClass>;

/**
 * Types needed for processing token patterns
 */
type PatternFunction = ((match: string) => string);  // converts a token name to token id
type PatternPair = [string, string];                 // an id and a pattern
type NameMap = Map<number, string[]>;                // token names by priority
type PatternMap = Map<number, PatternPair[]>;        // token patterns by priority
type StringMap = Map<string, string>;                // a generic map of strings
type NameMapMap = Map<number, StringMap>;            // map of names to pattern ids


/******************************************************************************/

/**
 * This is the main expression parser class.  It has a collection
 * of tokens that it recognizes tied to the classes that implement those
 * tokens.  It builds an AST based on the implementations of the tokens
 * using a stack-based approach, where pending operations and function calls
 * are stacked based on thinkgs like operator precedence.  The rules are
 * implemented in the token classes themselves, and when a new token is
 * processed, the top token on the list gets a chance to decide what to
 * do with the new token, and if it doesn't do anything, the new token gets
 * to decide how it should be handled given the tokens on the stack.  This
 * makes it possible to completley modify the action of the parser based on
 * the token classes themselves (rather than having to have a different parser
 * for different situations).  If a new feature is needed, an existing token
 * class can be subclassed and its behavior modified to meet the needs of
 * that feature.
 */
export class Parser {

  /**
   * The tokens that are allowed in the expressions parsed by
   * instances of this parser.
   */
  public static parseTokens: TokenList = {};

  /**
   * Standard tokens that can be generated internally by other tokens
   * (e.g., group tokens are created by delimiters).  These get looked up by
   * name and can b overridden here so that existing token classes will
   * call the modified versions without having to be subclassed themselves.
   */
  public static baseTokens: TokenList = BaseTokens;
  /**
   * Standard AST node classes, similar to baseTokens above.  These
   * are used by classes that need to create AST objects so that the
   * classes can be overridden without having to override all the
   * node classes that create them.
   */
  public static baseAst: AstList = {
      ...BaseAst, base: AstNode
  };

  /**
   * The expression string being processed.
   */
  public string: string = '';
  /**
   * The current location in the string.
   */
  public i: number = 0;

  /**
   * The token pattern for all the available tokens,
   *   taking their priorities into account.
   */
  protected pattern: RegExp | null = null;
  /**
   * A map of functions taking tokens back to their classes based on
   *  their priorities.
   */
  protected map: PatternFunction[] = [];

  /**
   * These are the instance-specific maps for the tokens that can be included
   *   in the expression, and the classes for tokens and AST obejcts that can
   *   be used internally.
   */
  public parseTokens: TokenMap = new Map();
  public tokenMap: TokenMap = new Map();
  public astMap: AstMap = new Map();

  /**
   * The token stack used during parsing the expression
   */
  public stack: Stack | null;

  /******************************************************************************/

  /**
   * The constructor copies the default token and node classes into the
   *   parser-specific maps.
   */
  constructor() {
    const CLASS = (this.constructor as typeof Parser);
    this.addParseTokens(CLASS.parseTokens);
    this.addBaseTokens(CLASS.baseTokens);
    this.addAstObjects(CLASS.baseAst);
  }

  /**
   * Add (or replace) token classes in the allowed-token list.
   */
  public addParseTokens(tokens: TokenList) {
    this.pattern = null;
    for (const id of Object.keys(tokens)) {
      this.parseTokens.set(id, tokens[id as keyof(typeof tokens)] as TokenClass);
    }
  }

  /**
   * Remove token classes from the allowed-token list.
   */
  public removeParseToken(id: string) {
    this.pattern = null;
    this.parseTokens.delete(id);
  }

  /**
   * Add (or replace) token classes in the base-token list.
   */
  public addBaseTokens(tokens: TokenList) {
    for (const id of Object.keys(tokens)) {
      this.tokenMap.set(id, tokens[id as keyof(typeof tokens)] as TokenClass);
    }
  }

  /**
   * Look up a token class in the base-token list.
   */
  public getBaseClass(type: string) {
    const creator = this.tokenMap.get(type);
    if (creator) return creator;
    throw Error('No definition for token class: ' + type);
  }

  /**
   * Create an instance of a token class using the classes in the baseToken list.
   *   Look up the class by name, or use the specific class, and pass the stack and any arguments
   *   to the class constructor.
   */
  public createToken(type: string | TokenClass, args: any[] = []): Token {
    return new (typeof type === 'string' ? this.getBaseClass(type) : type)(this.stack as Stack, ...args);
  }

  /**
   * Add (or replace) AST object classes in the AST-class list.
   */
  public addAstObjects(nodes: AstList) {
    for (const id of Object.keys(nodes)) {
      this.astMap.set(id, nodes[id as keyof(typeof nodes)] as AstObjectClass);
    }
  }

  /**
   * Look up and AST object class in the AST-class list.
   */
  public getAstClass(type: string) {
    const creator = this.astMap.get(type);
    if (creator) return creator;
    throw Error('No definition for AST class: ' + type);
  }

  /**
   * Create an instance of an AST node class using the classes in the AST-class list.
   *   Look up the class by name, or use the specific class, and pass any arguments
   *   to the class constructor.
   */
  public createAst(type: string | AstObjectClass, args: any[] = []): AstObject {
    return new (typeof type === 'string' ? this.getAstClass(type) : type)(...args);
  }

  /**
   * Check if a token is an instance of a given named class
   */
  public isa(type: string, token: Token) {
    return token instanceof this.getBaseClass(type);
  }

  /**
   * Check if a node is an instance of a given named AST node class
   */
  public isast(type: string, node: AstObject) {
    return node instanceof this.getAstClass(type);
  }

  /******************************************************************************/

  /**
   * Convert an expression string into the object-based AST.
   */
  public convert(input: string) {
    this.string = input.trim();
    this.i = 0;

    //
    //  Get the token pattern if we don't have it already
    //
    if (this.pattern === null) {
      this.getPattern();
    }

    //
    //  Create a token stack and push a Start token.
    //  Then loop through the tokens in the expression
    //    pushing them onto the stack (the stack manages
    //    how the tokens interact with each other).
    //  Finally, push an 'End' token to close the expression.
    //
    const stack = this.stack = new Stack(this);
    stack.push(this.createToken('Start'));
    let token = this.nextToken();
    while (token) {
      stack.push(token);
      token = this.nextToken();
    }
    stack.push(this.createToken('End'));

    //
    // Pop the top token, clear the stack (releasing memory)
    //   and return the top item's AST tree.
    //
    const top = this.stack.pop() as Token;
    this.stack = null;
    return top.tree();
  }

  /**
   * Get the next token in the expression.
   */
  protected nextToken() {
    //
    // Check if we're done.
    //
    if (this.i >= this.string.length) return null;
    //
    // Skip leading spaces.
    //
    while (this.string[this.i] === ' ') this.i++;
    //
    // Tell the pattern where to start and
    // look for the next token, if any.
    //
    (this.pattern as RegExp).lastIndex = this.i;
    const match = (this.pattern as RegExp).exec(this.string);
    if (match) {
      //
      //  Find which match group the token was in
      //  and advance pas the token, then look
      //  up the token class and create a new instance
      //  of it for this token string and return that
      //
      for (let n = 1; n < match.length; n++) {
        const term = match[n];
        if (term) {
          this.i += term.length;
          const token = this.parseTokens.get(this.map[n](term));
          return new (token as any)(this.stack, term);
        }
      }
    } else {
      throw Error(`Unexpected character: ${this.string[this.i]}`);
    }
  }

  //
  //  Clear the stack and generate an error.
  //
  public error(message: string) {
    this.stack = null;
    throw new Error(message);
  }

  /******************************************************************************/

  /**
   * Create the token pattern and the maps of tokens to their classes.
   */
  protected getPattern() {
    const [NAMES, NMAP, PATTERNS] = this.getNamesAndPatterns();
    const [PARTS, MAP] = this.getPatternParts(NAMES, NMAP, PATTERNS);
    this.pattern = new RegExp('(' + PARTS.join(')|(') + ')', 'y');
    this.map = MAP;
  }

  /**
   * Get the preliminary pattern maps based on priority.
   */
  protected getNamesAndPatterns() {
    const NAMES: NameMap = new Map();
    const PATTERNS: PatternMap = new Map();
    const NMAP: NameMapMap = new Map();
    for (const id of this.parseTokens.keys()) {
      const token = this.parseTokens.get(id) as TokenClass;
      const priority = token.priority;
      this.getNameData(id, priority, token, NAMES, NMAP);
      this.getPatternData(id, priority, token, PATTERNS);
    }
    return [NAMES, NMAP, PATTERNS] as [NameMap, NameMapMap, PatternMap];
  }

  /**
   * Add a token's name strings to the NAMES list for the correct priority,
   * and map thm back to the proper token ID in the parseToken list
   */
  protected getNameData(id: string, priority: number, token: TokenClass, NAMES: NameMap, NMAP: NameMapMap) {
    const names = token.token;
    if (names) {
      if (!NAMES.has(priority)) {
        NAMES.set(priority, []);
        NMAP.set(priority, new Map());
      }
      const nlist = NAMES.get(priority) as string[];
      const nmap = NMAP.get(priority) as StringMap;
      for (const name of (Array.isArray(names) ? names : [names])) {
        nlist.push(name);
        nmap.set(name, id);
      }
    }
  }

  /**
   * Add the token's id and pattern to the PATTERNS map.
   */
  protected getPatternData(id: string, priority: number, token: TokenClass, PATTERNS: PatternMap) {
    const pattern = token.pattern;
    if (pattern) {
      if (!PATTERNS.has(priority)) {
        PATTERNS.set(priority, []);
      }
      (PATTERNS.get(priority) as PatternPair[]).push([id, pattern]);
    }
  }

  /**
   * Get the list of token patterns in each priority, and the list of functions to map
   * a match to each pattern back to a token id (in the parseToken map).
   */
  protected getPatternParts(NAMES: NameMap, NMAP: NameMapMap, PATTERNS: PatternMap) {
    const PARTS: string[] = [];
    const MAP: PatternFunction[] = [(match: string) => match];
    //
    //  Get the list of priorities (without duplicates)
    //
    const keys = [...new Set(Array.from(NAMES.keys()).concat(Array.from(PATTERNS.keys())))];
    //
    //  Sort the priorities numerically, and loop through them.
    //    If there is a list of names for that priority,
    //      push the name pattern on the PARTS array
    //      push a function to return the proper id for the name
    //    If there is a pattern for that prioroty
    //      push the pattern on the PARTS list
    //      push a function returning the pattern's token id
    //
    for (const i of keys.sort((a, b) => a > b ? 1 : -1)) {
      if (NAMES.has(i)) {
        PARTS.push(this.getNamePattern(NAMES.get(i) as string[]));
        MAP.push(function (match) {return (NMAP.get(i) as StringMap).get(match) as string; });
      }
      if (PATTERNS.has(i)) {
        for (const [id, pattern] of (PATTERNS.get(i) as PatternPair[])) {
          PARTS.push(pattern);
          MAP.push(function (_match) {return id; });
        }
      }
    }
    return [PARTS, MAP] as [string[], PatternFunction[]];
  }

  /**
   * Create a pattern for a list of names, sorted by length (longest pattern matches first).
   */
  protected getNamePattern(NAMES: string[]) {
    const chars = NAMES.filter((x) => x.length === 1);
    const names = NAMES.filter((x) => x.length > 1).sort(
      (a, b) => (a.length < b.length ? 1 : a.length > b.length ? -1 : a < b ? -1 : a > b ? -1 : 0)
    ).map(
      (x) => x.replace(/([+*?.|^$\\(){}\[\]])/g, '\\$1')
    );
    if (chars.length) {
      names.push('[' + chars.join('').replace(/([-\\\[\]])/g, '\\$1') + ']');
    }
    return names.join('|');
  }

  /******************************************************************************/

  /**
   * Convert a JSON object to an AST by converting the
   * generic object to one of the proper kind.
   */
  public fromJSON(json: any) {
    const CLASS = this.getAstClass(json.kind);
    const def = {...json};
    delete def.kind;
    return CLASS.fromJSON(this, def);
  }

  /**
   * Convert a JSON string to an AST.
   */
  public fromJSONstring(json: string) {
    return this.fromJSON(JSON.parse(json));
  }

  /******************************************************************************/

}
