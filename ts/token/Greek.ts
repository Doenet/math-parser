import {Operand} from './BaseTokens';

/**
 * Lower-case greek letters (could have Unicode values added, and
 * could include normalization).
 */
export const LowercaseGreek = Operand.define('greek', {
  token: ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'iota', 'kappa', 'lambda',
          'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'psi', 'omega']
});

/**
 * Upper-case greek letters (could have Unicode values added, and
 * could include normalization).
 */
export const UppercaseGreek = Operand.define('greek', {
  token: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Iota', 'Kappa', 'Lambda',
          'Mu', 'Nu', 'Xi', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Psi', 'Omega']
});
