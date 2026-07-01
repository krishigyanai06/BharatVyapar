import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectResolvedRole, selectRoleColor } from '../../store/authSelectors';
import { useTranslation } from '../../hook/useTranslation';

import HomeScreen from '../../screen/app/BottomTabs/HomeScreen';
import MarketplaceScreen from '../../screen/app/Trades/Marketplace/MarketplaceScreen';
import TradesScreen from '../../screen/app/Trades/TradesScreen';
import SellCommodities from '../../screen/app/Trades/SellCommodities';
import ProfileScreen from '../../screen/app/BottomTabs/ProfileScreen';
import COLORS from '../../constant/colors';

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
    // If the system navigation/gesture bar is off (insets.bottom is 0),
    // add a fallback padding at the bottom so the buttons aren't flush with the physical edge.
    const paddingBottom = insets.bottom > 0 ? insets.bottom : 10;
    const height = 54 + paddingBottom;
    return {
      backgroundColor: COLORS.white || '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
      height: height,
      paddingBottom: paddingBottom,
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
  }), [roleColor, tabBarStyle]);

  // ─── Tab labels: stable, only change when language switches ─────────────────
  const labels = useMemo(() => ({
    home:    t('Home'),
    market:  t('Market'),
    trades:  t('Trades'),
    sell:    t('Sell'),
    profile: t('Profile'),
  }), [t]);

  // ─── Per-screen options: stable objects so Tab.Navigator never re-registers ─
  const tabOptions = useMemo(() => ({
    home:    { tabBarLabel: labels.home    },
    market:  { tabBarLabel: labels.market  },
    trades:  { tabBarLabel: labels.trades  },
    sell:    { tabBarLabel: labels.sell    },
    profile: { tabBarLabel: labels.profile },
  }), [labels]);

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home"    component={HomeScreen}        options={tabOptions.home}    />
      <Tab.Screen name="Market"  component={MarketplaceScreen} options={tabOptions.market}  />
      <Tab.Screen name="Trades"  component={TradesScreen}      options={tabOptions.trades}  />
      <Tab.Screen name="Sell"    component={SellCommodities}   options={tabOptions.sell}    />
      <Tab.Screen name="Profile" component={ProfileScreen}     options={tabOptions.profile} />
    </Tab.Navigator>
  );
}
