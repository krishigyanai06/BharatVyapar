import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { setSelectedRole as setSelectedRoleAction } from '../../../store/authSlice';
import { w, h, mw, f } from '../../../shared/utils/responsive';
import COLORS from '../../../theme/colors';
import Images from '../../../assets';
import { useTranslation } from '../../../shared/hooks/useTranslation';


const ROLES = [
  {
    id: 'FPO',
    title: 'FPO',
    subtitle: 'Manage farmer groups,\nprocurement & operations',
    iconName: 'account-group',
    theme: {
      bg: COLORS.fpoLight,
      iconBg: COLORS.fpoPrimary,
      activeBorder: COLORS.fpoPrimary,
      inactiveBorder: 'transparent',
      titleColor: COLORS.fpoText,
    },
  },
  {
    id: 'Trader',
    title: 'Trader',
    subtitle: 'Track orders, inventory\n& market opportunities',
    iconName: 'cart-outline',
    theme: {
      bg: COLORS.traderLight,
      iconBg: COLORS.traderPrimary,
      activeBorder: COLORS.traderPrimary,
      inactiveBorder: 'transparent',
      titleColor: COLORS.traderText,
    },
  },
  {
    id: 'Miller',
    title: 'Miller',
    subtitle: 'Manage processing units,\nquality & logistics',
    iconName: 'factory',
    theme: {
      bg: COLORS.millerLight,
      iconBg: COLORS.millerPrimary,
      activeBorder: COLORS.millerPrimary,
      inactiveBorder: 'transparent',
      titleColor: COLORS.millerText,
    },
  },
  {
    id: 'Corporate',
    title: 'Corporate',
    subtitle: 'Enterprise solutions,\nbulk procurement & analytics',
    iconName: 'office-building',
    theme: {
      bg: COLORS.corporateLight,
      iconBg: COLORS.corporatePrimary,
      activeBorder: COLORS.corporatePrimary,
      inactiveBorder: 'transparent',
      titleColor: COLORS.corporateText,
    },
  },
];

export default function RoleSelectionScreen({ navigation }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState(null);

  const selectedRoleData = ROLES.find(r => r.id === selectedRole);
  const roleColor = selectedRoleData?.theme?.iconBg || COLORS.traderPrimary;

  const handleContinue = () => {
    if (selectedRole) {
      dispatch(setSelectedRoleAction({ role: selectedRole, color: roleColor }));
      navigation.navigate('SendOtp', { selectedRole, roleColor });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image
            source={Images.splashScreen}
            style={styles.headerPlaceholder}
            resizeMode="cover"
          />
          {/* LOGO TEXT OVERLAY MASK */}
          <View style={styles.logoMaskContainer}>
            <View style={styles.logoTextRow}>
              <Text style={styles.greenLogoText}>Bharat </Text>
              <Text style={styles.orangeLogoText}>FPO</Text>
            </View>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDot} />
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.greenLogoText}>Vyapar</Text>
            <Text style={styles.subtext}>{t('Kisan ki Mehnat, Desh ki Samriddhi')}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{t('Welcome to Bharat FPO Vyapar')}</Text>
          <Text style={styles.subtitle}>
            {t('Select your role to personalize your experience')}
          </Text>

          {ROLES.map(role => {
            const isSelected = selectedRole === role.id;

            return (
              <TouchableOpacity
                key={role.id}
                activeOpacity={0.8}
                onPress={() => {
                  console.log('Role selected:', role.id);
                  setSelectedRole(role.id);
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor: role.theme.bg,
                    borderColor: isSelected
                      ? role.theme.activeBorder
                      : role.theme.inactiveBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: role.theme.iconBg },
                  ]}
                >
                  <Icon name={role.iconName} size={f(28)} color={COLORS.white} />
                </View>

                <View style={styles.textContainer}>
                  <Text
                    style={[styles.roleTitle, { color: role.theme.titleColor }]}
                  >
                    {t(role.title)}
                  </Text>
                  <Text style={styles.roleSubtitle}>{t(role.subtitle)}</Text>
                </View>

                <Icon
                  name="arrow-right"
                  size={f(24)}
                  color={role.theme.titleColor}
                />
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: roleColor },
              !selectedRole && styles.disabledButton,
            ]}
            disabled={!selectedRole}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>{t('Continue')}</Text>
            <Icon
              name="arrow-right"
              size={f(20)}
              color={COLORS.white}
              style={styles.continueIcon}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  imageContainer: {
    width: '100%',
    height: h(170),
    overflow: 'hidden',
    marginBottom: h(8),
    marginTop: h(10),
  },
  headerPlaceholder: {
    width: '100%',
    height: h(200),
    marginTop: -h(40),
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: w(20),
    paddingBottom: h(20),
  },
  title: {
    fontSize: f(20),
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: h(4),
  },
  subtitle: {
    fontSize: f(12),
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: h(12),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: h(14),
    paddingHorizontal: mw(12),
    borderRadius: mw(12),
    marginBottom: h(10),
    borderWidth: 1.5,
  },
  iconWrapper: {
    width: mw(46),
    height: mw(46),
    borderRadius: mw(23),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: w(12),
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  roleTitle: {
    fontSize: f(15),
    fontWeight: '700',
    marginBottom: h(2),
  },
  roleSubtitle: {
    fontSize: f(11),
    color: COLORS.textLight,
    lineHeight: f(16),
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.traderPrimary,
    paddingVertical: h(13),
    borderRadius: mw(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: h(10),
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueText: {
    color: COLORS.white,
    fontSize: f(16),
    fontWeight: '600',
  },
  continueIcon: {
    marginLeft: w(8),
  },
  logoMaskContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAFAF8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: h(12),
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenLogoText: {
    fontSize: f(26),
    fontWeight: 'bold',
    color: '#0F6938',
    letterSpacing: 0.5,
  },
  orangeLogoText: {
    fontSize: f(26),
    fontWeight: 'bold',
    color: '#F16F22',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: h(2),
    width: w(100),
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#0F6938',
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
    marginHorizontal: w(6),
  },
  subtext: {
    fontSize: f(10),
    fontWeight: '600',
    color: '#1C3E2A',
    marginTop: h(4),
    letterSpacing: 0.2,
  },
});
