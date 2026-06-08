import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeScreen } from '../../components/SafeScreen';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logoutUser } from '../../store/authSlice';
import { showAlert } from '../../components/CustomAlertBox';
import COLORS from '../../constant/colors';
import { w, h, f } from '../../utils/responsive';

const ROLE_THEMES = {
  FPO: {
    primary: COLORS.fpoPrimary,
    secondary: COLORS.fpoSecondary,
    light: COLORS.fpoLight,
    text: COLORS.fpoText,
  },
  Trader: {
    primary: COLORS.traderPrimary,
    secondary: COLORS.traderSecondary,
    light: COLORS.traderLight,
    text: COLORS.traderText,
  },
  Miller: {
    primary: COLORS.millerPrimary,
    secondary: COLORS.millerSecondary,
    light: COLORS.millerLight,
    text: COLORS.millerText,
  },
  Corporate: {
    primary: COLORS.corporatePrimary,
    secondary: COLORS.corporateSecondary,
    light: COLORS.corporateLight,
    text: COLORS.corporateText,
  },
};

const HomeScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const selectedRole = user?.role || 'User';
  const roleTheme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;
  const { top: topInset } = useSafeAreaInsets();

  const handleLogout = () => {
    showAlert({
      type: 'confirm',
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logoutUser());
          },
        },
      ],
    });
  };

  return (
    <SafeScreen style={{ backgroundColor: roleTheme.light }} top={false}>
      <View style={[styles.header, { backgroundColor: roleTheme.primary, paddingTop: topInset + h(10) }]}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.roleText}>{selectedRole || 'User'}</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.heading, { color: roleTheme.text }]}>Home Screen</Text>
        {user && (
          <Text style={styles.userInfo}>Phone: {user.phone || 'Not available'}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: roleTheme.secondary }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
    </SafeScreen>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: h(10),
    paddingBottom: h(30),
    paddingHorizontal: w(20),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  welcomeText: {
    fontSize: f(16),
    color: COLORS.white,
    opacity: 0.9,
  },
  roleText: {
    fontSize: f(32),
    fontWeight: '800',
    color: COLORS.white,
    marginTop: h(4),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: w(20),
  },
  heading: {
    fontSize: f(24),
    fontWeight: 'bold',
    marginBottom: h(10),
  },
  userInfo: {
    fontSize: f(14),
    color: COLORS.textLight,
  },
  logoutButton: {
    marginHorizontal: w(20),
    marginBottom: h(20),
    paddingVertical: h(16),
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.white,
    fontSize: f(16),
    fontWeight: '700',
  },
});