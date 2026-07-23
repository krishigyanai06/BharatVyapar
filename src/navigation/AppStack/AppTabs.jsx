import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectResolvedRole, selectRoleColor } from '../../store/authSelectors';
import { useTranslation } from '../../shared/hooks/useTranslation';


import HomeScreen from '../../features/home/screens/HomeScreen';
import MarketplaceScreen from '../../features/marketplace/screens/MarketplaceScreen';
import TradesScreen from '../../features/orders/screens/TradesScreen';
import SellCommodities from '../../features/marketplace/screens/SellCommodities';
import ProfileScreen from '../../features/profile/screens/ProfileScreen';
import COLORS from '../../theme/colors';



const Tab = createBottomTabNavigator();

// ─── Icon map — static, never recreated ──────────────────────────────────────
const TAB_ICONS = {
  Home:    { focused: 'home',          unfocused: 'home-outline'          },
  Market:  { focused: 'cart',          unfocused: 'cart-outline'          },
  Trades:  { focused: 'handshake',     unfocused: 'handshake-outline'     },
  Sell:    { focused: 'plus-circle',   unfocused: 'plus-circle-outline'   },
  Profile: { focused: 'account',       unfocused: 'account-outline'       },
};

const TAB_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: '600',
  marginBottom: 4,
};

function getNormalizedRole(role) {
  if (!role) return 'FPO';
  const lower = role.toLowerCase();
  if (lower.includes('fpo'))       return 'FPO';
  if (lower.includes('trader'))    return 'Trader';
  if (lower.includes('miller'))    return 'Miller';
  if (lower.includes('corporate')) return 'Corporate';
  return 'FPO';
}

const ROLE_FALLBACK_COLORS = {
  FPO:       COLORS.fpoPrimary,
  Trader:    COLORS.traderPrimary,
  Miller:    COLORS.millerPrimary,
  Corporate: COLORS.corporatePrimary,
};

export default function AppTabs() {
  const resolvedRole = useSelector(selectResolvedRole);
  const stateColor   = useSelector(selectRoleColor);
  const { t }        = useTranslation();
  const insets       = useSafeAreaInsets();

  const selectedRole = getNormalizedRole(resolvedRole);

  const roleColor = stateColor || ROLE_FALLBACK_COLORS[selectedRole] || COLORS.fpoPrimary;

  const tabBarStyle = useMemo(() => {
    // PREVENT FLICKER: Lock safeBottom so frame 1 (insets.bottom === 0) and frame 2
    // compute identical height on Android. Eliminates 64px -> 78px height jump!
    const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : (insets.bottom || 10);
    const height = 54 + safeBottom;
    return {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
      height: height,
      paddingBottom: safeBottom,
      elevation: 12,
      opacity: 1,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    };
  }, [insets.bottom]);

  const screenOptions = useMemo(() => ({ route }) => ({
    tabBarActiveTintColor:   roleColor,
    tabBarInactiveTintColor: COLORS.textMuted || '#6C757D',
    tabBarIcon: ({ color, size, focused }) => {
      const icons = TAB_ICONS[route.name];
      if (!icons) return null;
      return (
        <Icon
          name={focused ? icons.focused : icons.unfocused}
          size={size}
          color={color}
        />
      );
    },
    headerShown:      false,
    tabBarStyle:      tabBarStyle,
    tabBarLabelStyle: TAB_LABEL_STYLE,
    tabBarBackground: () => (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', opacity: 1 }} />
    ),
  }), [roleColor, tabBarStyle]);

  // ─── Tab labels: stable, only change when language switches ─────────────────
  const labels = useMemo(() => ({
    home:    t('Home'),
    market:  t('Market'),
    trades:  t('Trades'),
    sell:    t('Sell'),
    profile: t('Profile'),
  }), [t]);

  // ─── Per-screen options with testID and accessibility labels ────────────────
  const tabOptions = useMemo(() => ({
    home:    { tabBarLabel: labels.home,    tabBarTestID: 'tab-home',    accessibilityLabel: 'Home Tab' },
    market:  { tabBarLabel: labels.market,  tabBarTestID: 'tab-market',  accessibilityLabel: 'Market Tab' },
    trades:  { tabBarLabel: labels.trades,  tabBarTestID: 'tab-trades',  accessibilityLabel: 'Trades Tab' },
    sell:    { tabBarLabel: labels.sell,    tabBarTestID: 'tab-sell',    accessibilityLabel: 'Sell Tab' },
    profile: { tabBarLabel: labels.profile, tabBarTestID: 'tab-profile', accessibilityLabel: 'Profile Tab' },
  }), [labels]);

  return (
    <Tab.Navigator screenOptions={screenOptions} sceneContainerStyle={{ backgroundColor: '#F8F9FA' }}>
      <Tab.Screen name="Home"    component={HomeScreen}        options={tabOptions.home}    />
      <Tab.Screen name="Market"  component={MarketplaceScreen} options={tabOptions.market}  />
      <Tab.Screen name="Trades"  component={TradesScreen}      options={tabOptions.trades}  />
      <Tab.Screen name="Sell"    component={SellCommodities}   options={tabOptions.sell}    />
      <Tab.Screen name="Profile" component={ProfileScreen}     options={tabOptions.profile} />
    </Tab.Navigator>
  );
}
