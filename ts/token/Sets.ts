import {Delimiter, BinaryOp} from './BaseTokens';

/**
 * Set braces for use with explicit sets or set-builder notation
 */
export const SetBraces = Delimiter.define('set', {
  token: ['{', '}'], close: ['}'], allowEmpty: true, GroupAstClass: 'Set'
});

/**
 * Is-an-element-of operator (e.g., { x in R | 3 < x <=5 })
 */
export const In = BinaryOp.define('in', {
  token: ['in', '\u2208'], precedence: .5, normalizeTo: '\u2208'
});
