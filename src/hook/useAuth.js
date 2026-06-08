import { useSelector } from 'react-redux';

export const useAuth = () => {
  const auth = useSelector(state => state.auth || {});

  return {
    token: auth.token,
    user: auth.user,
    selectedRole: auth.selectedRole,
    roleColor: auth.roleColor,
    isAuthChecked: auth.isAuthChecked,
    sendOtpLoading: auth.sendOtpLoading,
    sendOtpError: auth.sendOtpError,
    verifyOtpLoading: auth.verifyOtpLoading,
    verifyOtpError: auth.verifyOtpError,
    isAuthenticated: Boolean(auth.token && auth.user),
  };
};
