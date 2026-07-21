// theme/roleThemes.js
// Single source of truth for role-based color themes.
//
// WHY here and not in profile.service.js?
//   profile.service.js is a feature-layer file — it owns profile business logic.
//   ROLE_THEMES is a UI infrastructure constant consumed by 14+ screens/components
//   across multiple features (marketplace, orders, home, shared). Keeping it in a
//   feature service creates an upward dependency (shared components importing from
//   a feature module), which violates the feature isolation contract.
//
//   Correct layer: theme/ → shared by all, depends on nothing but colors.js.
//
// Usage:
//   import { ROLE_THEMES } from '../../theme/roleThemes';
//   const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

import COLORS from './colors';

export const ROLE_THEMES = {
  FPO:       { primary: COLORS.fpoPrimary,       secondary: COLORS.fpoSecondary,       light: COLORS.fpoLight,       text: COLORS.fpoText,       accent: COLORS.fpoAccent },
  Trader:    { primary: COLORS.traderPrimary,    secondary: COLORS.traderSecondary,    light: COLORS.traderLight,    text: COLORS.traderText,    accent: COLORS.traderAccent },
  Miller:    { primary: COLORS.millerPrimary,    secondary: COLORS.millerSecondary,    light: COLORS.millerLight,    text: COLORS.millerText,    accent: COLORS.millerAccent },
  Corporate: { primary: COLORS.corporatePrimary, secondary: COLORS.corporateSecondary, light: COLORS.corporateLight, text: COLORS.corporateText, accent: COLORS.corporateAccent },
};
