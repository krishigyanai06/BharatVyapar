import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { selectUser, selectSelectedRole, selectRoleColor } from '../../store/authSelectors';

import HomeScreen from '../../screen/app/BottomTabs/HomeScreen';
import MarketplaceScreen from '../../screen/app/Trades/Marketplace/MarketplaceScreen';
import TradesScreen from '../../screen/app/Trades/TradesScreen';
import SellCommodities from '../../screen/app/Trades/SellCommodities';
import ProfileScreen from '../../screen/app/BottomTabs/ProfileScreen';
import COLORS from '../../constant/colors';

const Tab = createBottomTabNavigator();

const getScreenOptions = (roleColor) => ({ route }) => ({
  tabBarActiveTintColor: roleColor,
  tabBarInactiveTintColor: COLORS.textMuted || '#6C757D',
  tabBarIcon: ({ color, size, focused }) => {
    let iconName;
    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
    else if (route.name === 'Market') iconName = focused ? 'cart' : 'cart-outline';
    else if (route.name === 'Trades') iconName = focused ? 'handshake' : 'handshake-outline';
    else if (route.name === 'Sell') iconName = focused ? 'plus-circle' : 'plus-circle-outline';
    else if (route.name === 'Profile') iconName = focused ? 'account' : 'account-outline';
    return <Icon name={iconName} size={size} color={color} />;
  },
  headerShown: false,
  tabBarStyle: {
    backgroundColor: COLORS.white || '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
});

export default function AppTabs() {
  // PERFORMANCE FIX: Three separate subscriptions — AppTabs only re-renders
  // when user, selectedRole, or roleColor specifically change; not on every
  // auth action (e.g. profileLoading, sendOtpError) that other screens trigger.
  const user       = useSelector(selectUser);
  const stateRole  = useSelector(selectSelectedRole);
  const stateColor = useSelector(selectRoleColor);

  const getNormalizedRole = (role) => {
    if (!role) return 'FPO';
    const lower = role.toLowerCase();
    if (lower.includes('fpo')) return 'FPO';
    if (lower.includes('trader')) return 'Trader';
    if (lower.includes('miller')) return 'Miller';
    if (lower.includes('corporate')) return 'Corporate';
    return 'FPO';
  };

  const selectedRole = getNormalizedRole(stateRole || user?.role);

  const roleColor = stateColor || {
    FPO: COLORS.fpoPrimary,
    Trader: COLORS.traderPrimary,
    Miller: COLORS.millerPrimary,
    Corporate: COLORS.corporatePrimary,
  }[selectedRole] || COLORS.fpoPrimary;

  return (
    <Tab.Navigator screenOptions={getScreenOptions(roleColor)}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Market"
        component={MarketplaceScreen}
        options={{ tabBarLabel: 'Market' }}
      />
      <Tab.Screen
        name="Trades"
        component={TradesScreen}
        options={{ tabBarLabel: 'Trades' }}
      />
      <Tab.Screen
        name="Sell"
        component={SellCommodities}
        options={{ tabBarLabel: 'Sell' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
