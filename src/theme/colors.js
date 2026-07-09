// Theme — Single source of truth for all color tokens.
// Import from here: import COLORS from '../theme/colors';
// Never hardcode hex values in components.

const COLORS = {
  // ─── Role-based: FPO ───────────────────────────────────
  fpoPrimary: '#2B4D21',
  fpoSecondary: '#4a7c1f',
  fpoLight: '#F2F8F4',
  fpoBackground: '#dff0c0',
  fpoText: '#1C3E2A',
  fpoAccent: '#38A169',

  // ─── Role-based: Trader ────────────────────────────────
  traderPrimary: '#161455',
  traderSecondary: '#2b2a8f',
  traderLight: '#F0F2FA',
  traderBackground: '#d4d7f5',
  traderText: '#1F244C',
  traderAccent: '#4C51BF',

  // ─── Role-based: Miller ────────────────────────────────
  millerPrimary: '#8B4513',
  millerSecondary: '#a0522d',
  millerLight: '#FDF6F0',
  millerBackground: '#f5dcc8',
  millerText: '#5C2E0D',
  millerAccent: '#DD6B20',

  // ─── Role-based: Corporate ─────────────────────────────
  corporatePrimary: '#FF6B35',
  corporateSecondary: '#ff8c61',
  corporateLight: '#FFF4F0',
  corporateBackground: '#ffd4c3',
  corporateText: '#8B2500',
  corporateAccent: '#E53E3E',

  // ─── Common ────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  background: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  error: '#E53E3E',
  success: '#38A169',
  warning: '#DD6B20',
  info: '#3182CE',
};

export default COLORS;
