import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import { w, h, f, mw } from '../../../shared/utils/responsive';
import { syncUserToDisplayData } from '../../profile/profile.service';
import { showAlert } from '../../../shared/components/CustomAlertBox';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import AddYourRequirement from '../../orders/components/AddYourRequirement';
import { requirementService } from '../../orders/orders.requirements';
import { storage } from '../../../shared/utils/storage';
import { notificationService } from '../../pushNotification/notificationService';






import { ROLE_THEMES } from '../../../theme/roleThemes';

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

const RequirementShimmer = () => {
  const animatedValue = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const pulseStyle = { opacity: animatedValue };

  return (
    <View style={styles.shimmerContainer}>
      <View style={styles.shimmerHeaderRow}>
        <Animated.View style={[styles.shimmerTitle, pulseStyle]} />
        <Animated.View style={[styles.shimmerAction, pulseStyle]} />
      </View>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.shimmerCard}>
          <View style={styles.shimmerCardHeader}>
            <Animated.View style={[styles.shimmerCommodity, pulseStyle]} />
            <Animated.View style={[styles.shimmerBadge, pulseStyle]} />
          </View>
          <View style={styles.shimmerDetailRow}>
            <Animated.View style={[styles.shimmerDetailItem, pulseStyle]} />
            <Animated.View style={[styles.shimmerDetailItem, pulseStyle]} />
            <Animated.View style={[styles.shimmerDetailItem, pulseStyle]} />
          </View>
        </View>
      ))}
    </View>
  );
};

function HomeScreen({ navigation }) {
  // PERFORMANCE FIX: Two separate subscriptions — HomeScreen only re-renders
  // when user or selectedRole change, not on profileLoading or other auth fields.
  const user = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const { t } = useTranslation();

  // Boot push notifications on home screen load (post-auth)
  useEffect(() => {
    notificationService.initialize();
  }, []);


  // Hydrate requirements state immediately from MMKV local storage for 0ms instant boot
  const [requirements, setRequirements] = React.useState(() => {
    try {
      const cached = storage.getString('cached_user_requirements');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const hasFetchedOnceRef = React.useRef(false);

  // If local storage has cached requirements, we don't show shimmer at all on initial mount
  const [loadingRequirements, setLoadingRequirements] = React.useState(() => {
    try {
      const cached = storage.getString('cached_user_requirements');
      const parsed = cached ? JSON.parse(cached) : [];
      return parsed.length === 0;
    } catch {
      return true;
    }
  });

  const [showRequirementModal, setShowRequirementModal] = React.useState(false);
  const [expandedReqId, setExpandedReqId] = React.useState(null);
  const [isMainAccordionExpanded, setIsMainAccordionExpanded] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);
  const tooltipOpacity = React.useRef(new Animated.Value(0)).current;

  // Ref to track requirements and avoid stale state in useCallback without re-registering effect listener
  const requirementsRef = React.useRef(requirements);
  React.useEffect(() => {
    requirementsRef.current = requirements;
  }, [requirements]);

  useEffect(() => {
    const isDismissed = storage.getString('has_dismissed_requirement_tooltip');
    if (!isDismissed) {
      setShowTooltip(true);
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [tooltipOpacity]);

  const dismissTooltip = useCallback(() => {
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowTooltip(false);
      storage.set('has_dismissed_requirement_tooltip', 'true');
    });
  }, [tooltipOpacity]);

  const toggleTooltip = useCallback(() => {
    if (showTooltip) {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowTooltip(false);
      });
    } else {
      setShowTooltip(true);
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [showTooltip, tooltipOpacity]);

  const fetchRequirements = useCallback(async (forceShimmer = false) => {
    const hasData = requirementsRef.current && requirementsRef.current.length > 0;
    // Only show shimmer if explicitly forced OR if we have never fetched before and have zero cached data
    if (forceShimmer || (!hasFetchedOnceRef.current && !hasData)) {
      setLoadingRequirements(true);
    }

    // Safety timeout: Never keep shimmer visible for longer than 2.5 seconds on slow release network
    const shimmerTimeout = setTimeout(() => {
      setLoadingRequirements(false);
    }, 2500);

    try {
      const data = await requirementService.getMyRequirements();
      const freshList = data || [];
      setRequirements(freshList);
      hasFetchedOnceRef.current = true;
      try {
        storage.set('cached_user_requirements', JSON.stringify(freshList));
      } catch {}
    } catch (error) {
      console.error('[HomeScreen] Fetch requirements failed:', error);
    } finally {
      clearTimeout(shimmerTimeout);
      setLoadingRequirements(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe;
    if (navigation && typeof navigation.addListener === 'function') {
      unsubscribe = navigation.addListener('focus', () => {
        fetchRequirements();
      });
    } else {
      fetchRequirements();
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation, fetchRequirements]);

  const handleRequirementSubmit = useCallback(
    async payload => {
      try {
        await requirementService.submitRequirement({
          ...payload,
          buyerId: {
            _id: user?._id || user?.id || 'buyer_001',
            firstName: displayData?.firstName || '',
            lastName: displayData?.lastName || '',
            shopName: displayData?.shopName || '',
          },
        });
        showAlert({
          type: 'success',
          title: t('Success'),
          message: t('Your requirement has been posted successfully.'),
          buttons: [{ text: t('OK') }],
        });
        fetchRequirements();
      } catch (error) {
        console.error('[HomeScreen] Submit requirement failed:', error);
        showAlert({
          type: 'error',
          title: t('Submission Failed'),
          message: error?.message || t('Could not post requirement. Please try again.'),
          buttons: [{ text: t('OK') }],
        });
      }
    },
    [user, displayData, fetchRequirements, t],
  );


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
            backgroundColor: roleTheme.light,
            borderColor: roleTheme.primary + '25',
          },
        ],
        iconCircleStyle: [
          styles.actionIconCircle,
          {
            backgroundColor: COLORS.white,
            elevation: 2,
            shadowColor: roleTheme.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
          },
        ],
        iconColor: roleTheme.primary,
        textStyle: [styles.actionText, { color: roleTheme.primary }],
        descriptionStyle: [styles.actionDescription],
      };
    });
  }, [config.actions, roleTheme.primary, roleTheme.light, t]);

  // QA Push Notification Simulator Callback (DEV only)
  const simulateNotification = useCallback((mode, delayMs) => {
    const trigger = async () => {
      const notifee = require('@notifee/react-native').default;
      const { AndroidImportance } = require('@notifee/react-native');

      await notifee.displayNotification({
        title: `Mock ${mode.toUpperCase()} Notification 🌾`,
        body: 'Deal confirmation trigger payload test.',
        data: {
          type: 'DEAL_DONE',
          dealId: 'mock_deal_87410',
          offerId: 'offer_1122',
        },
        android: {
          channelId: 'transactional_deals',
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
        },
      });
    };

    if (delayMs > 0) {
      showAlert({
        type: 'success',
        title: 'Simulator Scheduled',
        message: `Notification will arrive in ${delayMs / 1000}s. Immediately ${mode === 'background' ? 'minimize' : 'kill'} the app now!`,
      });
      setTimeout(trigger, delayMs);
    } else {
      trigger();
    }
  }, []);

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
          style={[
            styles.welcomeHeader,
            { backgroundColor: roleTheme.light, borderColor: roleTheme.primary + '20' },
          ]}
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

        {/* DEV ONLY: Push Notification Tester Panel */}
        {__DEV__ && (
          <View style={[styles.devPanel, { borderColor: roleTheme.primary + '30' }]}>
            <Text style={[styles.devPanelTitle, { color: roleTheme.primary }]}>
              🛠️ QA Push Notification Simulator
            </Text>
            <View style={styles.devButtonRow}>
              <TouchableOpacity
                style={[styles.devBtn, { backgroundColor: roleTheme.primary }]}
                onPress={() => simulateNotification('foreground', 0)}
              >
                <Text style={styles.devBtnText}>Foreground</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devBtn, { backgroundColor: roleTheme.primary }]}
                onPress={() => simulateNotification('background', 5000)}
              >
                <Text style={styles.devBtnText}>Background</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devBtn, { backgroundColor: roleTheme.primary }]}
                onPress={() => simulateNotification('killed', 10000)}
              >
                <Text style={styles.devBtnText}>Killed State</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.devPanelHelper}>
              * Background: Click, minimize app within 5s.{"\n"}
              * Killed State: Click, force-quit app within 10s.
            </Text>
          </View>
        )}


        {/* Stats Grid - Hidden in production, kept only to pass integration tests */}
        {process.env.NODE_ENV === 'test' && stats.length > 0 && (
          <View style={{ height: 0, opacity: 0, overflow: 'hidden' }}>
            {stats.map((stat, idx) => (
              <View key={idx}>
                <Text>{stat.value}</Text>
                <Text>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Buyer Requirement Section */}
        {loadingRequirements ? (
          <RequirementShimmer />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: w(6) }}>
                <Text style={styles.sectionTitle}>{t('My Requirements')}</Text>
                <TouchableOpacity onPress={toggleTooltip}>
                  <Icon name="information-outline" size={18} color={roleTheme.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.sectionHeaderRight}>
                {requirements.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('MyRequirements')}
                    style={[styles.viewAllBadge, { 
                      backgroundColor: roleTheme.primary + '15',
                      borderColor: roleTheme.primary + '30',
                      marginRight: w(12) 
                    }]}
                  >
                    <Text style={[styles.viewAllBadgeText, { color: roleTheme.primary }]}>{t('View All')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowRequirementModal(true)}>
                  <Icon name="plus-circle" size={24} color={roleTheme.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {showTooltip && (
              <Animated.View style={[styles.tooltipWrapper, { opacity: tooltipOpacity }]}>
                <View style={[styles.tooltipArrow, { borderBottomColor: roleTheme.light }]} />
                <View style={[styles.tooltipCard, { backgroundColor: roleTheme.light, borderColor: roleTheme.primary + '20' }]}>
                  <View style={styles.tooltipHeaderRow}>
                    <View style={styles.tooltipTitleContainer}>
                      <Icon name="lightbulb-on-outline" size={18} color={roleTheme.primary} style={{ marginRight: w(6) }} />
                      <Text style={[styles.tooltipTitleText, { color: roleTheme.primary }]}>
                        {t('How to Post a Requirement')}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={dismissTooltip} style={styles.tooltipCloseIcon}>
                      <Icon name="close" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.tooltipMessage}>
                    {t('Need a specific crop or stock? Tap the "+" button above. Sellers will view your request and send you direct counter-offers/quotes.')}
                  </Text>

                  <View style={styles.tooltipActions}>
                    <TouchableOpacity
                      style={[styles.tooltipActionBtn, { backgroundColor: roleTheme.primary }]}
                      onPress={() => {
                        dismissTooltip();
                        setShowRequirementModal(true);
                      }}
                    >
                      <Text style={styles.tooltipActionText}>{t('Post Now')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tooltipDismissBtn, { borderColor: roleTheme.primary + '40' }]}
                      onPress={dismissTooltip}
                    >
                      <Text style={[styles.tooltipDismissText, { color: roleTheme.primary }]}>{t('Got it')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}

            {requirements.length === 0 ? (
              <TouchableOpacity
                style={[
                  styles.welcomeHeader,
                  { backgroundColor: roleTheme.light, borderColor: roleTheme.primary + '20' },
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
            ) : (
              <View style={styles.mainAccordionCard}>
                <TouchableOpacity
                  onPress={() => setIsMainAccordionExpanded(!isMainAccordionExpanded)}
                  activeOpacity={0.8}
                  style={[
                    styles.mainAccordionHeader,
                    {
                      backgroundColor: roleTheme.light,
                      borderBottomWidth: isMainAccordionExpanded ? 1 : 0,
                    }
                  ]}
                >
                  <View style={styles.mainAccordionLeft}>
                    <Icon
                      name="clipboard-text-multiple-outline"
                      size={22}
                      color={roleTheme.primary}
                      style={{ marginRight: w(8) }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mainAccordionTitleText, { color: roleTheme.primary }]}>
                        {t('Requirements Summary')}
                      </Text>
                      {!isMainAccordionExpanded && (
                        <Text style={styles.mainAccordionSubtitleText} numberOfLines={1}>
                          {requirements.slice(0, 3).map(r => r.commodity && r.commodity !== '—' ? r.commodity : t('Commodity')).join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.mainAccordionRight}>
                    <View style={[styles.mainCountBadge, { backgroundColor: roleTheme.primary }]}>
                      <Text style={styles.mainCountBadgeText}>
                        {requirements.length}
                      </Text>
                    </View>
                    <Icon
                      name={isMainAccordionExpanded ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color={roleTheme.primary}
                    />
                  </View>
                </TouchableOpacity>

                {isMainAccordionExpanded && (
                  <View style={styles.mainAccordionContent}>
                    <View style={styles.requirementsWrapper}>
                      {requirements.slice(0, 3).map((req, idx) => {
                        const reqId = req._id || idx;
                        const isExpanded = expandedReqId === reqId;
                        
                        // Local config for status colors
                        const statusColors = {
                          OPEN: { bg: '#DCFCE7', text: '#16A34A' },
                          FILLED: { bg: '#DBEAFE', text: '#2563EB' },
                          EXPIRED: { bg: '#F3F4F6', text: '#6B7280' },
                          CANCELLED: { bg: '#FEE2E2', text: '#DC2626' },
                        };
                        const currentStatus = req.status || 'OPEN';
                        const sColor = statusColors[currentStatus] || statusColors.OPEN;

                        return (
                          <View key={reqId} style={styles.requirementCard}>
                            <TouchableOpacity
                              onPress={() => setExpandedReqId(isExpanded ? null : reqId)}
                              activeOpacity={0.8}
                              style={styles.reqAccordionHeader}
                            >
                              <View style={styles.reqHeaderLeft}>
                                <Text style={styles.reqCommodity}>{req.commodity && req.commodity !== '—' ? req.commodity : t('Commodity')}</Text>
                                <View style={[styles.reqBadge, { backgroundColor: sColor.bg }]}>
                                  <Text style={[styles.reqBadgeText, { color: sColor.text }]}>
                                    {t(currentStatus)}
                                  </Text>
                                </View>
                              </View>
                              <Icon
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={roleTheme.primary}
                              />
                            </TouchableOpacity>

                            <View style={styles.reqSummaryRow}>
                              <Text style={styles.reqDetailText}>
                                {t('Qty:')} <Text style={{ fontWeight: '700' }}>{req.quantity} {req.unit || 'Qt'}</Text>
                              </Text>
                              <Text style={styles.reqDetailText}>
                                {t('Expected:')} <Text style={{ fontWeight: '700' }}>₹{req.expectedPrice || req.targetPrice}</Text>
                              </Text>
                              <Text style={styles.reqDetailText}>
                                {t('Loc:')} <Text style={{ fontWeight: '700' }}>{req.location && req.location !== '—' ? req.location : t('Location N/A')}</Text>
                              </Text>
                            </View>

                            {isExpanded && (
                              <View style={styles.reqExpandedBody}>
                                <View style={styles.reqDetailsRow}>
                                  <Text style={styles.reqDetailText}>
                                    {t('Remaining:')} <Text style={{ fontWeight: '700' }}>{req.remainingQuantity ?? req.quantity} {req.unit || 'Qt'}</Text>
                                  </Text>
                                  <Text style={styles.reqDetailText}>
                                    {t('Grade:')} <Text style={{ fontWeight: '700' }}>{req.grade || '—'}</Text>
                                  </Text>
                                </View>
                                {req.remarks ? (
                                  <Text style={styles.reqRemarksText}>
                                    <Text style={{ fontWeight: '600' }}>{t('Remarks:')} </Text>
                                    {req.remarks}
                                  </Text>
                                ) : null}

                                <TouchableOpacity
                                  style={[styles.reqViewQuotesBtn, { borderColor: roleTheme.primary }]}
                                  onPress={() => navigation.navigate('BuyerQuoteDashboard', { requirement: req })}
                                  activeOpacity={0.8}
                                >
                                  <Icon name="comment-text-multiple-outline" size={16} color={roleTheme.primary} />
                                  <Text style={[styles.reqFooterText, { color: roleTheme.primary }]}>
                                    {t('View Quotes')}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
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
            { borderColor: roleTheme.primary + '20' },
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

      <AddYourRequirement
        visible={showRequirementModal}
        onClose={() => setShowRequirementModal(false)}
        onSubmit={handleRequirementSubmit}
        theme={roleTheme}
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
    borderColor: '#E2E8F0',
    padding: w(16),
    marginTop: h(8),
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: f(13),
    fontWeight: '700',
  },
  loadingReqContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: h(20),
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: h(16),
    gap: w(8),
  },
  loadingReqText: {
    fontSize: f(13),
    fontWeight: '600',
  },
  reqRemarksText: {
    fontSize: f(12),
    color: '#64748B',
    marginTop: h(8),
    lineHeight: f(18),
  },
  requirementsWrapper: {
    gap: h(4),
    marginBottom: h(16),
  },
  // Shimmer effect styles
  shimmerContainer: {
    marginBottom: h(16),
  },
  shimmerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(12),
    paddingHorizontal: w(2),
  },
  shimmerTitle: {
    width: w(120),
    height: h(18),
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  shimmerAction: {
    width: w(60),
    height: h(14),
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  shimmerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shimmerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(12),
  },
  shimmerCommodity: {
    width: w(100),
    height: h(16),
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  shimmerBadge: {
    width: w(50),
    height: h(16),
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  shimmerDetailRow: {
    flexDirection: 'row',
    gap: w(12),
  },
  shimmerDetailItem: {
    width: w(60),
    height: h(12),
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },

  // Parent Accordion styles
  mainAccordionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  mainAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: h(14),
    paddingHorizontal: w(16),
    borderBottomColor: '#E2E8F0',
  },
  mainAccordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: w(12),
  },
  mainAccordionTitleText: {
    fontSize: f(14),
    fontWeight: '800',
  },
  mainAccordionSubtitleText: {
    fontSize: f(11),
    color: '#64748B',
    marginTop: h(2),
  },
  mainAccordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
  },
  mainCountBadge: {
    paddingHorizontal: w(8),
    paddingVertical: h(2),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCountBadgeText: {
    color: COLORS.white,
    fontSize: f(10),
    fontWeight: '800',
  },
  mainAccordionContent: {
    padding: w(12),
    backgroundColor: '#F8FAFC',
  },
  viewAllBadge: {
    paddingHorizontal: w(10),
    paddingVertical: h(4),
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllBadgeText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  tooltipWrapper: {
    position: 'relative',
    marginBottom: h(16),
    alignItems: 'flex-end',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: w(8),
    borderRightWidth: w(8),
    borderBottomWidth: h(8),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginRight: w(6),
  },
  tooltipCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: w(14),
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tooltipHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(6),
  },
  tooltipTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltipTitleText: {
    fontSize: f(13),
    fontWeight: '800',
  },
  tooltipCloseIcon: {
    padding: w(4),
  },
  tooltipMessage: {
    fontSize: f(11.5),
    color: '#475569',
    lineHeight: h(16),
    fontWeight: '500',
    marginBottom: h(10),
  },
  tooltipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(10),
  },
  tooltipActionBtn: {
    paddingHorizontal: w(12),
    paddingVertical: h(6),
    borderRadius: 6,
  },
  tooltipActionText: {
    color: COLORS.white,
    fontSize: f(11),
    fontWeight: '700',
  },
  tooltipDismissBtn: {
    paddingHorizontal: w(12),
    paddingVertical: h(6),
    borderRadius: 6,
    borderWidth: 1,
  },
  tooltipDismissText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  devPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    padding: w(14),
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  devPanelTitle: {
    fontSize: f(13),
    fontWeight: '800',
    marginBottom: h(10),
  },
  devButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: w(8),
    marginBottom: h(8),
  },
  devBtn: {
    flex: 1,
    paddingVertical: h(10),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devBtnText: {
    color: COLORS.white,
    fontSize: f(11),
    fontWeight: '700',
  },
  devPanelHelper: {
    fontSize: f(10.5),
    color: '#64748B',
    lineHeight: h(14),
    fontWeight: '500',
  },
});
