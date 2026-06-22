/**
 * authSelectors.js
 *
 * Granular selectors for the auth Redux slice.
 *
 * WHY THIS FILE EXISTS (performance context):
 *   Every component that did `useSelector(s => s.auth)` subscribed to the
 *   entire auth slice object. When `getUserDetails.fulfilled` ran the reducer:
 *     state.user = { ...(state.user || {}), ...action.payload }
 *   it produced a NEW object reference for `state.auth.user` even when the
 *   data was identical. All 12+ subscribed components fired simultaneously,
 *   producing the ~1.29s "Render" phase bursts seen in the profiler.
 *
 *   FIX: Each component now selects only the specific field(s) it needs.
 *   react-redux's useSelector uses strict === equality — a component only
 *   re-renders if its specific selected value changed. Components that only
 *   need `selectedRole` will NOT re-render when `user` changes.
 *
 * USAGE:
 *   import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
 *   const user = useSelector(selectUser);
 *   const stateRole = useSelector(selectSelectedRole);
 */

import { createSelector } from '@reduxjs/toolkit';

// ─── Primitive (atomic) selectors ────────────────────────────────────────────
// These are simple field accessors — zero computation, zero allocation.
// react-redux compares their return value with === to decide if a re-render
// is needed. Since these return primitives (string/boolean/null), reference
// equality is the same as value equality — no false positives.

export const selectAuthToken         = state => state.auth.token;
export const selectUser              = state => state.auth.user;
export const selectSelectedRole      = state => state.auth.selectedRole;
export const selectRoleColor         = state => state.auth.roleColor;
export const selectIsAuthChecked     = state => state.auth.isAuthChecked;
export const selectProfileLoading    = state => state.auth.profileLoading;
export const selectProfileError      = state => state.auth.profileError;
export const selectSendOtpLoading    = state => state.auth.sendOtpLoading;
export const selectVerifyOtpLoading  = state => state.auth.verifyOtpLoading;
export const selectSendOtpError      = state => state.auth.sendOtpError;
export const selectVerifyOtpError    = state => state.auth.verifyOtpError;

// ─── Derived / memoized selectors (createSelector) ───────────────────────────
// createSelector memoizes the result — the output is only recomputed when one
// of the input selectors returns a new value. This prevents the computed object
// from getting a new reference on every call, which would defeat useSelector's
// equality check.

/**
 * Returns true only when BOTH token AND user are non-null.
 * Replaces: Boolean(token && user) computed inline in components.
 */
export const selectIsAuthenticated = createSelector(
  selectAuthToken,
  selectUser,
  (token, user) => Boolean(token && user),
);

/**
 * Resolves the active role in priority order: stateRole → user.role → 'FPO'.
 * Replaces: stateRole || user?.role || 'FPO' computed inline in every screen.
 * Only recomputes when selectedRole or user changes.
 */
export const selectResolvedRole = createSelector(
  selectSelectedRole,
  selectUser,
  (stateRole, user) => stateRole || user?.role || 'FPO',
);
