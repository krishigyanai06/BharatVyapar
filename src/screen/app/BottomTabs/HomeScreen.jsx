import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { SafeScreen } from '../../../components/SafeScreen';
import AppHeader from '../../../components/AppHeader';
import COLORS from '../../../constant/colors';
import { w, h, f } from '../../../utils/responsive';
import { syncUserToDisplayData } from '../../../service/user/userService';
import { showAlert } from '../../../components/CustomAlertBox';

const ROLE_THEMES = {
  FPO: {
    primary: COLORS.fpoPrimary,
    secondary: COLORS.fpoSecondary,
    light: COLORS.fpoLight,
    text: COLORS.fpoText,
    accent: '#38A169',
  },
  Trader: {
    primary: COLORS.traderPrimary,
    secondary: COLORS.traderSecondary,
    light: COLORS.traderLight,
    text: COLORS.traderText,
    accent: '#4C51BF',
  },
  Miller: {
    primary: COLORS.millerPrimary,
    secondary: COLORS.millerSecondary,
    light: COLORS.millerLight,
    text: COLORS.millerText,
    accent: '#DD6B20',
  },
  Corporate: {
    primary: COLORS.corporatePrimary,
    secondary: COLORS.corporateSecondary,
    light: COLORS.corporateLight,
    text: COLORS.corporateText,
    accent: '#E53E3E',
  },
};

const ROLE_CONFIGS = {
  FPO: {
    stats: [
      { label: 'Member Stock', value: '1,250 MT', icon: 'warehouse' },
      { label: 'Active Loans', value: '₹18.5 L', icon: 'cash-multiple' },
      { label: 'Active Listings', value: '8 Offers', icon: 'storefront' },
    ],
    actions: [
      { name: 'Buy', icon: 'cart-outline', tab: 'Market', highlight: true },
      { name: 'Sell', icon: 'storefront-outline', screen: 'Sell', highlight: true },
      { name: 'Book Storage', icon: 'warehouse', screen: 'WarehouseScreen' },
      { name: 'Apply Loan', icon: 'cash-refund', screen: 'FinanceScreen' },
    ],
  },
  Trader: {
    stats: [
      { label: 'Purchased Stock', value: '3,400 MT', icon: 'warehouse' },
      { label: 'Trade Finance', value: '₹45.0 L', icon: 'cash-multiple' },
      { label: 'Active Bids', value: '12 Bids', icon: 'gavel' },
    ],
    actions: [
      { name: 'Buy', icon: 'cart-outline', tab: 'Market', highlight: true },
      { name: 'Sell', icon: 'storefront-outline', screen: 'Sell', highlight: true },
      { name: 'Locate Storage', icon: 'warehouse', screen: 'WarehouseScreen' },
      { name: 'Trade Finance', icon: 'cash-refund', screen: 'FinanceScreen' },
    ],
  },
  Miller: {
    stats: [
      { label: 'Milling Stock', value: '2,100 MT', icon: 'warehouse' },
      { label: 'Material Loans', value: '₹30.0 L', icon: 'cash-multiple' },
      { label: 'Buy Indents', value: '4 Active', icon: 'clipboard-list' },
    ],
    actions: [
      { name: 'Buy', icon: 'cart-outline', tab: 'Market', highlight: true },
      { name: 'Sell', icon: 'storefront-outline', screen: 'Sell', highlight: true },
      { name: 'Factory Storage', icon: 'warehouse', screen: 'WarehouseScreen' },
      { name: 'Capital Loan', icon: 'cash-refund', screen: 'FinanceScreen' },
    ],
  },
  Corporate: {
    stats: [
      { label: 'Bulk Inventory', value: '12,500 MT', icon: 'warehouse' },
      { label: 'Corporate Credit', value: '₹1.2 Cr', icon: 'cash-multiple' },
      { label: 'Open Tenders', value: '6 Bids', icon: 'file-document-outline' },
    ],
    actions: [
      { name: 'Buy', icon: 'cart-outline', tab: 'Market', highlight: true },
      { name: 'Sell', icon: 'storefront-outline', screen: 'Sell', highlight: true },
      { name: 'Bulk Storage', icon: 'warehouse', screen: 'WarehouseScreen' },
      { name: 'Credit Limit', icon: 'cash-refund', screen: 'FinanceScreen' },
    ],
  },
};

const MANDI_PRICES = [
  { crop: 'Wheat (Kanak)', price: '₹2,450/Qtl', change: '+₹25', up: true },
  { crop: 'Soybean (Yellow)', price: '₹4,820/Qtl', change: '-₹40', up: false },
  { crop: 'Chana (Gram)', price: '₹5,150/Qtl', change: '+₹15', up: true },
];

export default function HomeScreen({ navigation }) {
  // PERFORMANCE FIX: Two separate subscriptions — HomeScreen only re-renders
  // when user or selectedRole change, not on profileLoading or other auth fields.
  const user      = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  
  const selectedRole = useMemo(() => stateRole || user?.role || 'FPO', [stateRole, user?.role]);
  const roleTheme = useMemo(() => ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO, [selectedRole]);
  const config = useMemo(() => ROLE_CONFIGS[selectedRole] || ROLE_CONFIGS.FPO, [selectedRole]);
  const { top: topInset } = useSafeAreaInsets();

  const handleAction = useCallback((item) => {
    try {
      console.log(`[HomeScreen] handleAction navigation triggered: target screen=${item.screen}, tab=${item.tab}`);
      if (item.screen) {
        navigation.navigate(item.screen);
      } else if (item.tab) {
        navigation.navigate(item.tab);
      }
    } catch (error) {
      console.error('[HomeScreen] handleAction navigation failure:', error);
      showAlert({
        type: 'error',
        title: 'Navigation Error',
        message: 'Could not complete the transition to the requested page.',
        buttons: [{ text: 'OK' }]
      });
    }
  }, [navigation]);

  const displayData = useMemo(() => syncUserToDisplayData(user), [user]);
  const fullName = useMemo(() => {
    return [displayData.firstName, displayData.lastName].filter(Boolean).join(' ').trim();
  }, [displayData.firstName, displayData.lastName]);

  // Precalculated layouts and colors to optimize JSX and avoid layout calculation overhead
  const headerPaddingTop = useMemo(() => topInset + h(10), [topInset]);
  const userNameStyle = useMemo(() => [styles.userName, { color: roleTheme.primary }], [roleTheme.primary]);
  const seeAllStyle = useMemo(() => [styles.seeAllText, { color: roleTheme.primary }], [roleTheme.primary]);
  const welcomeText = useMemo(() => fullName || user?.phone || 'Partner', [fullName, user?.phone]);

  const stats = useMemo(() => {
    return (config.stats || []).map((stat) => ({
      ...stat,
      iconWrapperStyle: [
        styles.statIconWrapper,
        { backgroundColor: roleTheme.primary + '15' }
      ],
      iconColor: roleTheme.primary
    }));
  }, [config.stats, roleTheme.primary]);

  const quickActions = useMemo(() => {
    return (config.actions || []).map((act) => {
      const isHighlight = act.highlight;
      return {
        ...act,
        buttonStyle: [
          styles.actionButton,
          isHighlight && {
            borderColor: roleTheme.primary,
            borderWidth: 1,
            backgroundColor: roleTheme.primary + '05',
          }
        ],
        iconCircleStyle: [
          styles.actionIconCircle,
          isHighlight
            ? { backgroundColor: roleTheme.primary }
            : { backgroundColor: '#F1F5F9' }
        ],
        iconColor: isHighlight ? COLORS.white : COLORS.textLight,
        textStyle: [
          styles.actionText,
          isHighlight && { color: roleTheme.primary, fontWeight: '800' }
        ]
      };
    });
  }, [config.actions, roleTheme.primary]);

  const mandiPrices = useMemo(() => {
    return (MANDI_PRICES || []).map((item) => {
      const trendBg = item.up ? COLORS.success + '15' : COLORS.error + '15';
      const trendColor = item.up ? COLORS.success : COLORS.error;
      const trendIcon = item.up ? 'trending-up' : 'trending-down';
      return {
        ...item,
        cropIconBg: COLORS.success + '15',
        trendBg,
        trendColor,
        trendIcon
      };
    });
  }, []);

  return (
    <SafeScreen style={styles.safeContainer} top={false} bottom={false}>
      <AppHeader
        backgroundColor={roleTheme.primary}
        paddingTop={headerPaddingTop}
        title="Bharat FPO Vyapar"
        subtitle={`${selectedRole} Dashboard`}
        showBackButton={false}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View 
          style={styles.welcomeHeader}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`Welcome back, ${welcomeText}. Manage your agriculture trading & storage seamlessly.`}
        >
          <Text style={styles.welcomeTitle}>Welcome back,</Text>
          <Text style={userNameStyle}>
            {welcomeText}
          </Text>
          <Text style={styles.welcomeSubtitle}>Manage your agriculture trading & storage seamlessly.</Text>
        </View>

        {/* Stats Row */}
        {stats.length > 0 ? (
          <View style={styles.statsContainer}>
            {stats.map((stat, idx) => (
              <View 
                key={idx} 
                style={styles.statCard}
                accessible={true}
                accessibilityLabel={`${stat.label}: ${stat.value}`}
              >
                <View style={stat.iconWrapperStyle}>
                  <Icon name={stat.icon} size={18} color={stat.iconColor} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer} accessible={true} accessibilityLabel="No stats available.">
            <Text style={styles.emptyText}>No stats available</Text>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeader} accessible={true} accessibilityRole="header">
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        {quickActions.length > 0 ? (
          <View style={styles.gridContainer}>
            {quickActions.map((act, idx) => (
              <TouchableOpacity
                key={idx}
                style={act.buttonStyle}
                onPress={() => handleAction(act)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Navigate to ${act.name}`}
                accessibilityHint={`Opens the ${act.name} feature`}
              >
                <View style={act.iconCircleStyle}>
                  <Icon name={act.icon} size={22} color={act.iconColor} />
                </View>
                <Text style={act.textStyle}>{act.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer} accessible={true} accessibilityLabel="No quick actions available.">
            <Text style={styles.emptyText}>No actions available</Text>
          </View>
        )}

        {/* Mandi Ticker */}
        <View style={styles.sectionHeader} accessible={true} accessibilityRole="header">
          <Text style={styles.sectionTitle}>Live Mandi Prices</Text>
          <TouchableOpacity 
            activeOpacity={0.6}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="View All Mandi Prices"
            accessibilityHint="Navigates to details for all mandi prices"
          >
            <Text style={seeAllStyle}>View All</Text>
          </TouchableOpacity>
        </View>
        {mandiPrices.length > 0 ? (
          <View style={styles.mandiCard}>
            {mandiPrices.map((item, idx) => (
              <View 
                key={idx} 
                style={[styles.mandiRow, idx !== mandiPrices.length - 1 && styles.borderBottom]}
                accessible={true}
                accessibilityLabel={`Mandi price for ${item.crop}: ${item.price}, change is ${item.change}`}
              >
                <View style={styles.cropInfo}>
                  <View style={[styles.cropIconContainer, { backgroundColor: item.cropIconBg }]}>
                    <Icon name="sprout" size={16} color={COLORS.success} />
                  </View>
                  <Text style={styles.cropName}>{item.crop}</Text>
                </View>
                <View style={styles.mandiPriceCol}>
                  <Text style={styles.cropPrice}>{item.price}</Text>
                  <View style={[styles.mandiTrend, { backgroundColor: item.trendBg }]}>
                    <Icon
                      name={item.trendIcon}
                      size={12}
                      color={item.trendColor}
                    />
                    <Text style={[styles.cropChange, { color: item.trendColor }]}>
                      {item.change}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.mandiCard} accessible={true} accessibilityLabel="No live mandi prices available at this time.">
            <Text style={styles.emptyText}>No live mandi prices available</Text>
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: w(16),
    paddingBottom: h(20),
    paddingTop: h(8),
  },
  welcomeHeader: {
    paddingVertical: h(4),
    marginBottom: h(12),
  },
  welcomeTitle: {
    fontSize: f(13),
    color: '#64748B',
    fontWeight: '500',
  },
  userName: {
    fontSize: f(20),
    fontWeight: '800',
    marginTop: h(2),
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: f(12),
    color: '#94A3B8',
    marginTop: h(2),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(16),
    gap: w(8),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: h(12),
    paddingHorizontal: w(6),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: h(6),
  },
  statValue: {
    fontSize: f(13),
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: f(10),
    fontWeight: '600',
    color: '#64748B',
    marginTop: h(2),
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(10),
  },
  sectionTitle: {
    fontSize: f(14),
    fontWeight: '800',
    color: '#1E293B',
  },
  seeAllText: {
    fontSize: f(12),
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: h(16),
    rowGap: h(10),
  },
  actionButton: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: h(12),
    paddingHorizontal: w(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: h(8),
  },
  actionText: {
    fontSize: f(13),
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  mandiCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: w(14),
    marginBottom: h(16),
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mandiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: h(10),
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: w(10),
  },
  cropName: {
    fontSize: f(13),
    fontWeight: '700',
    color: '#1E293B',
  },
  mandiPriceCol: {
    alignItems: 'flex-end',
  },
  cropPrice: {
    fontSize: f(13),
    fontWeight: '800',
    color: '#1E293B',
  },
  mandiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: h(2),
    paddingHorizontal: w(6),
    paddingVertical: h(2),
    borderRadius: 6,
  },
  cropChange: {
    fontSize: f(11),
    fontWeight: '800',
    marginLeft: w(2),
  },
  emptyContainer: {
    padding: h(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: h(16),
  },
  emptyText: {
    fontSize: f(13),
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  safeContainer: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
});
