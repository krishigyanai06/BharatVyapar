/**
 * useAuth.js
 *
 * PERFORMANCE FIX:
 *   The original implementation selected the entire auth slice as a single object:
 *     const auth = useSelector(state => state.auth || {});
 *   This caused every consumer of useAuth() to re-render whenever ANY auth field
 *   changed (profileLoading, sendOtpError, etc.), not just the fields they use.
 *
 *   FIX: Each field is now selected with a separate granular selector. react-redux
 *   v9 runs each selector independently and only re-renders if the specific
 *   selected value changes (strict === comparison).
 *   Components that consume useAuth() and only use `token` will now only
 *   re-render when `token` changes.
 */
import { useSelector } from 'react-redux';
import {
  selectAuthToken,
  selectUser,
  selectSelectedRole,
  selectRoleColor,
  selectIsAuthChecked,
  selectSendOtpLoading,
  selectSendOtpError,
  selectVerifyOtpLoading,
  selectVerifyOtpError,
  selectIsAuthenticated,
} from '../store/authSelectors';

export const useAuth = () => {
  const token           = useSelector(selectAuthToken);
  const user            = useSelector(selectUser);
  const selectedRole    = useSelector(selectSelectedRole);
  const roleColor       = useSelector(selectRoleColor);
  const isAuthChecked   = useSelector(selectIsAuthChecked);
  const sendOtpLoading  = useSelector(selectSendOtpLoading);
  const sendOtpError    = useSelector(selectSendOtpError);
  const verifyOtpLoading = useSelector(selectVerifyOtpLoading);
  const verifyOtpError  = useSelector(selectVerifyOtpError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return {
    token,
    user,
    selectedRole,
    roleColor,
    isAuthChecked,
    sendOtpLoading,
    sendOtpError,
    verifyOtpLoading,
    verifyOtpError,
    isAuthenticated,
  };
};
