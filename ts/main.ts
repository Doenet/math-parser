/*
 *  Load the expression parser and the definitions for the various tokens to allow
 */
import {Parser} from './Parser';
import * as Standard from './token/Standard';
import * as Greek from './token/Greek';
import * as Inequalities from './token/Inequalities';
import * as Sets from './token/Sets';

/*
 * Support for converting the object-based AST into the original
 * array-based AST.
 */
import {AstArrayVisitor} from './ArrayVisitor';

/*
 * Create an expression parser, and add the tokens we want to support
 *  (e.g., the operators, functions, parentheses, etc., the greek letters,
 *  inequalities, sets, and so on).  One can custom tailor the parser
 *  to recognize only the ones you want.  For example, for a problem
 *  that asks a student to evaluate sin(pi/3), you might not want to include
 *  trigonometric functions as being allowed in the student answer, so could
 *  leave those out.  See the token definitions for the various items
 *  that they include.
 */
const parser = new Parser();
parser.addParseTokens(Standard);
parser.addParseTokens(Greek);
parser.addParseTokens(Inequalities);
parser.addParseTokens(Sets);

/*
 * The tree walker to convert to AST arrays
 */
const Visitor = new AstArrayVisitor(parser);

/*
 * Tell Typescript about node's process variable
 */
declare var process: {
  argv: any[];
};

/*
 * Parse the expression provided on the command line
 *   and output the JSON version of the internal AST,
 *   the array AST, and the expression as reconstructed
 *   from the internal AST (via its toString() method).
 */
const ast = parser.convert(process.argv[2]);
console.log(ast.toJSON());
console.log(Visitor.visit(ast));
console.log(ast.toString());

/*
 * This shows how to get the internal AST back from
 *   the JSON form.
 */
/*
const ast2 = parser.fromJSON(ast.toJSON());
console.log('---------------');
console.log(ast2);
console.log(Visitor.visit(ast2));
console.log(ast2.toString());
*/
