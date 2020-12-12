import {BinaryOp, UnaryOp, Operand, Apply, Delimiter, LookAhead} from './BaseTokens';
import {FuncName} from '../ast/Func';

/**
 * Comma operator for general lists or point, vectors, etc.
 */
export const List = BinaryOp.define('list', {
  token: [','], precedence: .25, combine: true, isComma: true, opString: ', '
});

/**
 * Generic addition operator (with unary addition allowed)
 */
export const Plus = BinaryOp.define('plus', {
  token: '+', precedence: 1, combine: true, type: 'both',
  unaryClass: UnaryOp.define('uplus', {precedence: 3})
});

/**
 * Unary negation operator (where negative numbers are generated automatically)
 */
export class UnaryMinus extends UnaryOp {
  public negateNumbers: boolean;
  public tree() {
    if (this.negateNumbers && this.ast.childNodes.length === 1 &&
        this.isast('Num', this.ast.childNodes[0])) {
      const num = this.ast.childNodes[0];
      if (num.value > 0) {
        num.value = -num.value;
        return num;
      }
    }
    return super.tree();
  }
}
UnaryOp.define('uminus', {precedence: 3, negateNumbers: true}, UnaryMinus);

/**
 * Generic minus operator (and unary negation)
 */
export const Minus = BinaryOp.define('plus', {
  token: ['-', '\u2212'], precedence: 1, type: 'both', normalizeTo: '-',
  unaryClass: UnaryMinus
});

/**
 * Generic multiplication operator
 */
export const Multiply = BinaryOp.define('multiply', {token: '*', precedence: 2, combine: true});

/**
 * Generic division operator
 */
export const Divide  = BinaryOp.define('divide', {token: '/', precedence: 2, equalParens: true});

/**
 * Generic exponentiation (handles functional bases and turns ^-1 into an inverse)
 */
export class Power extends BinaryOp {
  public tree() {
    const child = this.ast.childNodes;
    if (this.applyData && this.isast('FuncName', child[0]) &&
        (child[0] as FuncName).inverse && child[1].toString() === '-1') {
      child[0].value = (child[0] as FuncName).inverse;
      return child[0];
    }
    return super.tree();
  }
}
BinaryOp.define(
  'power', {
    token: ['^'], precedence: 4, associativity: 'right', appliesLeft: true, opString: '^'
  },
  Power
);

/**
 * Factorial operator
 */
export const Factorial = UnaryOp.define('factorial', {token: ['!'], precedence: 5, associativity: 'right'});

/**
 * Parenthesis delimiters
 */
export const Parens = Delimiter.define('parens', {
  token: ['(', ')'], close: [')'],
  removable: true, removePrecedence: .99,
  isApply: true
});

/**
 * Vertical bar pseudo operator (can become absolute value or set-builder "such that")
 */
export const Bar = LookAhead.define('|', {
  token: '|', close: '|',
  operatorClass: BinaryOp.define('|', {precedence: .1}),
  delimiterClass: Delimiter.define('|', {close: ['|'], groupType: 'abs'})
});

/**
 * Generic identifier operand (single character)
 */
export const Identifier = Operand.define('identifier', {pattern: '[a-zA-Z]'});

/**
 * General number token (don't include optional negative sign, or 'x-1' will become 'x*(-1)';
 *   negative numbers are produced through the unary minus operator above).
 */
export const Numeric = Operand.define('number', {
  pattern: '[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+', canApply: true, astClass: 'Num'
});

/**
 * Basic trig functions
 */
export const Trig = Apply.define('trig', {
  token: ['sin', 'cos', 'tan', 'sec', 'csc', 'cot'],
  autoApply: true,
  isInvertible: true
});

/**
 * Inverse trig functions
 */
export const TrigInverse = Apply.define('trig', {
  token: ['asin', 'acos', 'atan', 'asec', 'acsc', 'acot'],
  autoApply: true
});

/**
 * Hyperbolic trig functions
 */
export const HyerbolicTrig = Apply.define('trig', {
  token: ['sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth'],
  autoApply: true,
  isInvertible: true
});

/**
 * Inverse hyperbolic functions
 */
export const HyperbolicTrigInverse = Apply.define('trig', {
  token: ['asinh', 'acosh', 'atanh', 'asech', 'acsch', 'acoth'],
  autoApply: true
});

/**
 * Prime operator (e.g., for derivatives)
 */
export const Prime = UnaryOp.define('prime', {
  token: ['\''], precedence: 6, associativity: 'right', appliesLeft: true
});

/**
 * Generic single-variable functions
 */
export const FunctionLetters = Apply.define('functions', {token: ['f', 'g'], requireArgument: false});

/**
 * Sample functions with different numbers of arguments
 */
export const Funcs2 = Apply.define('functions', {token: ['h'], requireArgument: false, args: 2});
export const Funcs3 = Apply.define('functions', {token: ['F'], requireArgument: false, args: Infinity});
