import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import { w, h, f, mw } from '../../../shared/utils/responsive';
import { syncUserToDisplayData } from '../../profile/profile.service';
import { showAlert } from '../../../shared/components/CustomAlertBox';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import RequirementBottomSheet from '../../orders/components/RequirementBottomSheet';

import { requirementService } from '../../orders/orders.requirements';


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
      { label: 'Procured Val', value: '₹28.4 L', icon: 'cash-multiple' },
      { label: 'Active Deals', value: '8 Deals', icon: 'check-all' },
    ],
    actions: [
      {
        name: 'Buy',
        description: 'Explore market listings and place offers',
        icon: 'cart-outline',
        tab: 'Market',
        highlight: true,
      },
      {
        name: 'Sell',
        description: 'Publish crop stock details to find buyers',
        icon: 'storefront-outline',
        screen: 'Sell',
        highlight: true,
      },
    ],
  },
  Trader: {
    stats: [
      { label: 'Purchased Stock', value: '3,400 MT', icon: 'warehouse' },
      { label: 'Trade Finance', value: '₹45.0 L', icon: 'cash-multiple' },
      { label: 'Active Bids', value: '12 Bids', icon: 'gavel' },
    ],
    actions: [
      {
        name: 'Buy',
        description: 'Explore market listings and place offers',
        icon: 'cart-outline',
        tab: 'Market',
        highlight: true,
      },
      {
        name: 'Sell',
        description: 'Publish crop stock details to find buyers',
        icon: 'storefront-outline',
        screen: 'Sell',
        highlight: true,
      },
    ],
  },
  Miller: {
    stats: [
      { label: 'Milling Stock', value: '2,100 MT', icon: 'warehouse' },
      { label: 'Material Loans', value: '₹30.0 L', icon: 'cash-multiple' },
      { label: 'Buy Indents', value: '4 Active', icon: 'clipboard-list' },
    ],
    actions: [
      {
        name: 'Buy',
        description: 'Explore market listings and place offers',
        icon: 'cart-outline',
        tab: 'Market',
        highlight: true,
      },
      {
        name: 'Sell',
        description: 'Publish crop stock details to find buyers',
        icon: 'storefront-outline',
        screen: 'Sell',
        highlight: true,
      },
    ],
  },
  Corporate: {
    stats: [
      { label: 'Bulk Inventory', value: '12,500 MT', icon: 'warehouse' },
      { label: 'Corporate Credit', value: '₹1.2 Cr', icon: 'cash-multiple' },
      { label: 'Open Tenders', value: '6 Bids', icon: 'file-document-outline' },
    ],
    actions: [
      {
        name: 'Buy',
        description: 'Explore market listings and place offers',
        icon: 'cart-outline',
        tab: 'Market',
        highlight: true,
      },
      {
        name: 'Sell',
        description: 'Publish crop stock details to find buyers',
        icon: 'storefront-outline',
        screen: 'Sell',
        highlight: true,
      },
    ],
  },
};

function HomeScreen({ navigation }) {
  // PERFORMANCE FIX: Two separate subscriptions — HomeScreen only re-renders
  // when user or selectedRole change, not on profileLoading or other auth fields.
  const user = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const { t } = useTranslation();

  // Deal Lifecycle Engine: Buyer Requirements
  const [requirements, setRequirements] = React.useState([]);
  const [showRequirementModal, setShowRequirementModal] = React.useState(false);
  const [loadingRequirements, setLoadingRequirements] = React.useState(false);
  const [expandedReqId, setExpandedReqId] = React.useState(null);

  React.useEffect(() => {
    const fetchRequirements = async () => {
      setLoadingRequirements(true);
      try {
        const myId = user?._id || user?.id;
        const res = await requirementService.getAllRequirements();
        if (res?.success) {
          const all = res.data.requirements || [];
          // Dummy mode: buyer_001 = currentBuyer. Real mode: match actual user._id
          const mine = all.filter(r => {
            const bid = r.buyerId?._id || r.buyerId;
            return String(bid) === String(myId) || String(bid) === 'buyer_001';
          });
          setRequirements(mine);
        }
      } catch (e) {
        console.warn('[HomeScreen] Requirements endpoint not available:', e?.message || e);
      } finally {
        setLoadingRequirements(false);
      }
    };
    fetchRequirements();
  }, [user?._id, user?.id]);

  const handleRequirementSubmit = async payload => {
    const res = await requirementService.submitRequirement({
      ...payload,
      buyerId: {
        _id: user?._id || user?.id || 'me',
        firstName: displayData.firstName || '',
        lastName: displayData.lastName || '',
      },
    });
    if (res?.success) {
      setRequirements(prev => [...prev, res.data]);
    }
  };

  const selectedRole = useMemo(
    () => stateRole || user?.role || 'FPO',
    [stateRole, user?.role],
  );
  const roleTheme = useMemo(
    () => ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO,
    [selectedRole],
  );
  const config = useMemo(
    () => ROLE_CONFIGS[selectedRole] || ROLE_CONFIGS.FPO,
    [selectedRole],
  );
  const { top: topInset } = useSafeAreaInsets();

  const handleAction = useCallback(
    item => {
      try {
        console.log(
          `[HomeScreen] handleAction navigation triggered: target screen=${item.screen}, tab=${item.tab}`,
        );
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
          buttons: [{ text: 'OK' }],
        });
      }
    },
    [navigation],
  );

  const displayData = useMemo(() => syncUserToDisplayData(user), [user]);
  const fullName = useMemo(() => {
    return [displayData.firstName, displayData.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
  }, [displayData.firstName, displayData.lastName]);

  // Precalculated layouts and colors to optimize JSX and avoid layout calculation overhead
  const headerPaddingTop = useMemo(() => topInset + h(10), [topInset]);
  const userNameStyle = useMemo(
    () => [styles.userName, { color: roleTheme.primary }],
    [roleTheme.primary],
  );
  const welcomeText = useMemo(
    () => fullName || user?.phone || t('Partner'),
    [fullName, user?.phone, t],
  );

  const stats = useMemo(() => {
    return (config.stats || []).map(stat => ({
      ...stat,
      label: t(stat.label),
      value: t(stat.value),
      iconWrapperStyle: [
        styles.statIconWrapper,
        { backgroundColor: roleTheme.primary + '15' },
      ],
      iconColor: roleTheme.primary,
    }));
  }, [config.stats, roleTheme.primary, t]);

  const quickActions = useMemo(() => {
    return (config.actions || []).map(act => {
      return {
        ...act,
        name: t(act.name),
        description: t(act.description),
        buttonStyle: [
          styles.actionButton,
          {
            borderColor: roleTheme.primary + '20',
          },
        ],
        iconCircleStyle: [
          styles.actionIconCircle,
          { backgroundColor: roleTheme.primary + '10' },
        ],
        iconColor: roleTheme.primary,
        textStyle: [styles.actionText, { color: roleTheme.primary }],
        descriptionStyle: [styles.actionDescription],
      };
    });
  }, [config.actions, roleTheme.primary, t]);

  return (
    <SafeScreen style={styles.safeContainer} top={false} bottom={false}>
      <AppHeader
        backgroundColor={roleTheme.primary}
        paddingTop={headerPaddingTop}
        title={t('Bharat FPO Vyapar')}
        subtitle={t(`${selectedRole} Dashboard`)}
        showBackButton={false}
        showLanguageSwitcher={true}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View
          style={[styles.welcomeHeader, { borderLeftColor: roleTheme.primary }]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`${t('Welcome back,')} ${welcomeText}. ${t(
            'Empowering your agricultural trade transactions.',
          )}`}
        >
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeTitle}>{t('Welcome back,')}</Text>
              <Text style={userNameStyle}>{welcomeText}</Text>
              <Text style={styles.welcomeSubtitle}>
                {t('Empowering your agricultural trade transactions.')}
              </Text>
            </View>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: roleTheme.primary },
              ]}
            >
              {displayData.profileImage ? (
                <Image
                  source={{ uri: displayData.profileImage }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {welcomeText ? welcomeText.substring(0, 1).toUpperCase() : 'B'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Buyer Requirement Section */}
        {requirements.length === 0 && !loadingRequirements ? (
          <TouchableOpacity
            style={[
              styles.welcomeHeader,
              { backgroundColor: roleTheme.light, borderColor: roleTheme.primary, borderLeftColor: roleTheme.primary },
            ]}
            onPress={() => setShowRequirementModal(true)}
          >
            <View style={styles.welcomeRow}>
              <View style={styles.welcomeTextContainer}>
                <Text style={[styles.welcomeTitle, { color: roleTheme.primary, fontWeight: 'bold' }]}>
                  {t('Looking for a specific commodity?')}
                </Text>
                <Text style={[styles.welcomeSubtitle, { color: roleTheme.text }]}>
                  {t('Post your requirement here and sellers will contact you directly.')}
                </Text>
              </View>
              <View style={[styles.avatarCircle, { backgroundColor: roleTheme.primary }]}>
                <Icon name="plus" size={24} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        ) : requirements.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('My Requirements')}</Text>
              <TouchableOpacity onPress={() => setShowRequirementModal(true)}>
                <Icon name="plus-circle" size={24} color={roleTheme.primary} />
              </TouchableOpacity>
            </View>
            {requirements.map((req, idx) => {
              const reqId = req.id || req._id || idx;
              const isExpanded = expandedReqId === reqId;
              return (
                <View key={reqId} style={styles.requirementCard}>
                  {/* Accordion Header — tap to expand/collapse */}
                  <TouchableOpacity
                    onPress={() => setExpandedReqId(isExpanded ? null : reqId)}
                    activeOpacity={0.8}
                    style={styles.reqAccordionHeader}
                  >
                    <View style={styles.reqHeaderLeft}>
                      <Text style={styles.reqCommodity}>{t(req.commodity)}</Text>
                      <View style={[styles.reqBadge, { backgroundColor: roleTheme.primary + '15' }]}>
                        <Text style={[styles.reqBadgeText, { color: roleTheme.primary }]}>
                          {t(req.status || 'OPEN')}
                        </Text>
                      </View>
                    </View>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={roleTheme.primary}
                    />
                  </TouchableOpacity>

                  {/* Summary always visible */}
                  <View style={styles.reqSummaryRow}>
                    <Text style={styles.reqDetailText}>
                      {t('Qty:')} <Text style={{ fontWeight: '700' }}>{req.quantity} {t(req.unit || 'Qt')}</Text>
                    </Text>
                    <Text style={styles.reqDetailText}>
                      {t('Expected:')} <Text style={{ fontWeight: '700' }}>₹{req.expectedPrice || req.targetPrice}</Text>
                    </Text>
                    <Text style={styles.reqDetailText}>
                      {t('Loc:')} <Text style={{ fontWeight: '700' }}>{t(req.location)}</Text>
                    </Text>
                  </View>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={styles.reqExpandedBody}>
                      <View style={styles.reqDetailsRow}>
                        <Text style={styles.reqDetailText}>
                          {t('Remaining:')} <Text style={{ fontWeight: '700' }}>{req.remainingQuantity ?? req.quantity} {t(req.unit || 'Qt')}</Text>
                        </Text>
                        <Text style={styles.reqDetailText}>
                          {t('Grade:')} <Text style={{ fontWeight: '700' }}>{t(req.grade) || '—'}</Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.reqViewQuotesBtn, { borderColor: roleTheme.primary }]}
                        onPress={() => navigation.navigate('BuyerQuoteDashboard', { requirement: req })}
                        activeOpacity={0.8}
                      >
                        <Icon name="format-list-bulleted" size={14} color={roleTheme.primary} />
                        <Text style={[styles.reqFooterText, { color: roleTheme.primary }]}>
                          {t('View Received Quotes')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        ) : null}

        {/* Stats Row */}
        {stats.length > 0 && (
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
        )}

        {/* Trade Operations Section */}
        <View
          style={styles.sectionHeader}
          accessible={true}
          accessibilityRole="header"
        >
          <Text style={styles.sectionTitle}>{t('Trade Operations')}</Text>
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
                accessibilityLabel={t('Navigate to {name}').replace(
                  '{name}',
                  act.name,
                )}
                accessibilityHint={t('Opens the {name} feature').replace(
                  '{name}',
                  act.name,
                )}
              >
                <View style={act.iconCircleStyle}>
                  <Icon name={act.icon} size={24} color={act.iconColor} />
                </View>
                <Text style={act.textStyle}>{act.name}</Text>
                <Text style={act.descriptionStyle}>{act.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View
            style={styles.emptyContainer}
            accessible={true}
            accessibilityLabel={t('No actions available.')}
          >
            <Text style={styles.emptyText}>{t('No actions available')}</Text>
          </View>
        )}

        {/* Help & Support */}
        <View
          style={[
            styles.supportCard,
            { borderColor: roleTheme.primary + '15', borderLeftColor: roleTheme.primary },
          ]}
        >
          <View style={styles.supportRow}>
            <View
              style={[
                styles.supportIconContainer,
                { backgroundColor: roleTheme.primary + '15' },
              ]}
            >
              <Icon name="headset" size={20} color={roleTheme.primary} />
            </View>
            <View style={styles.supportTextContainer}>
              <Text style={[styles.supportTitle, { color: roleTheme.primary }]}>
                {t('Help & Support Desk')}
              </Text>
              <Text style={styles.supportDesc}>
                {t(
                  'Have questions about trades or transactions? We are here 24/7.',
                )}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.supportBtn,
                { backgroundColor: roleTheme.primary, shadowColor: roleTheme.primary },
              ]}
              activeOpacity={0.8}
              onPress={() =>
                showAlert({
                  type: 'info',
                  title: t('Support Helpdesk'),
                  message: t(
                    'Our helpline is active. Connecting you to a support agent shortly.',
                  ),
                  buttons: [{ text: t('OK') }],
                })
              }
            >
              <Text style={styles.supportBtnText}>{t('Contact')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <RequirementBottomSheet
        visible={showRequirementModal}
        onClose={() => setShowRequirementModal(false)}
        onSubmit={handleRequirementSubmit}
      />
    </SafeScreen>
  );
}

export default React.memo(HomeScreen);

const styles = StyleSheet.create({
  safeContainer: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: w(16),
    paddingBottom: h(30),
    paddingTop: h(12),
  },
  welcomeHeader: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(18),
    marginBottom: h(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E2E8F0',
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTextContainer: {
    flex: 1,
    paddingRight: w(12),
  },
  welcomeTitle: {
    fontSize: f(12),
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: f(22),
    fontWeight: '800',
    color: '#0F172A',
    marginTop: h(4),
    letterSpacing: -0.4,
  },
  welcomeSubtitle: {
    fontSize: f(12),
    color: '#64748B',
    marginTop: h(6),
    lineHeight: h(17),
    fontWeight: '500',
  },
  avatarCircle: {
    width: w(52),
    height: w(52),
    borderRadius: mw(26),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: f(22),
    color: COLORS.white,
    fontWeight: '800',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(20),
    gap: w(12),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: h(16),
    paddingHorizontal: w(8),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: h(10),
  },
  statValue: {
    fontSize: f(16),
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },

  statLabel: {
    fontSize: f(11),
    fontWeight: '700',
    color: '#64748B',
    marginTop: h(4),
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(12),
    paddingHorizontal: w(2),
  },
  sectionTitle: {
    fontSize: f(15),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(24),
    gap: w(12),
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: h(22),
    paddingHorizontal: w(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  actionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: h(12),
  },
  actionText: {
    fontSize: f(16),
    fontWeight: '800',
    marginBottom: h(6),
  },
  actionDescription: {
    fontSize: f(11),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: h(15),
    paddingHorizontal: w(4),
    color: '#64748B',
  },
  supportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    padding: w(16),
    marginTop: h(8),
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E2E8F0',
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: w(12),
  },
  supportTextContainer: {
    flex: 1,
    paddingRight: w(8),
  },
  supportTitle: {
    fontSize: f(14),
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: h(4),
  },
  supportDesc: {
    fontSize: f(11),
    color: '#64748B',
    lineHeight: h(16),
    fontWeight: '500',
  },
  supportBtn: {
    paddingHorizontal: w(16),
    paddingVertical: h(9),
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  supportBtnText: {
    color: COLORS.white,
    fontSize: f(11),
    fontWeight: '800',
  },
  emptyContainer: {
    padding: h(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: h(16),
  },
  emptyText: {
    fontSize: f(13),
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  requirementCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: h(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  reqAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: w(16),
    paddingTop: h(14),
    paddingBottom: h(8),
  },
  reqHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    flex: 1,
  },
  reqSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(12),
    paddingHorizontal: w(16),
    paddingBottom: h(14),
  },
  reqExpandedBody: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: w(16),
    paddingTop: h(12),
    paddingBottom: h(14),
    backgroundColor: '#F8FAFC',
  },
  reqViewQuotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    marginTop: h(12),
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: w(14),
    paddingVertical: h(9),
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  reqCommodity: {
    fontSize: f(16),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  reqBadge: {
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 6,
  },
  reqBadgeText: {
    fontSize: f(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reqDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(10),
  },
  reqDetailText: {
    fontSize: f(12),
    color: '#475569',
    marginRight: w(12),
    marginBottom: h(4),
    fontWeight: '500',
  },
  reqFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
    marginTop: h(10),
  },
  reqFooterText: {
    fontSize: f(12),
    fontWeight: '800',
  },
});
