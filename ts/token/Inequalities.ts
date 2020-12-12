import {Relation, Angle} from './BaseTokens';

/**
 * Strict inequalities
 */
export const StrictInequalities = Relation.define('inequalities', {token: ['<', '>'], priority: 15});

/**
 * Weak inequalities
 */
export const WeakInequalities = Relation.define('inequalities', {
  token: ['<=', '>=', '\u2264', '\u2265'],           // the parse strings
  combined: {'<=': '<', '>=': '>'},                  // combine to multi-relations named by strict inequalities
  normalize: {'\u2264': '<=', '\u2265': '>='},       // normalize to ASCII strings for token values
  opStrings: {'<=': ' \u2264 ', '>=': ' \u2265 '},   // use Unicode strings for output
});

/**
 * Equals
 */
export const Equals = Relation.define('equals', {token: ['=']});

/**
 * No equals
 */
export const NotEqual = Relation.define('notequal', {
  token: ['!=', '\u2260'],   // the parse strings
  combine: false,            // do not form multi-relation
  normalizeTo: '!=',         // use ASCII string for token value
  opString: '\u2260'         // use Unicode string for output
});

/**
 * Special hangling of < for use with vectors and inequalities.
 */
export const InequalitiesWithVectors = Angle.define('angle', {});
