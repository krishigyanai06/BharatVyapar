import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { selectUser, selectSelectedRole } from '../../../../../store/authSelectors';
import COLORS from '../../../../../constant/colors';
import { w, h, f } from '../../../../../utils/responsive';
import { getReceivedOffers } from '../../../../../service/buy/buyCommodityService';

const ROLE_THEMES = {
  FPO:       { primary: COLORS.fpoPrimary,       secondary: COLORS.fpoSecondary,       light: COLORS.fpoLight,       text: COLORS.fpoText },
  Trader:    { primary: COLORS.traderPrimary,    secondary: COLORS.traderSecondary,    light: COLORS.traderLight,    text: COLORS.traderText },
  Miller:    { primary: COLORS.millerPrimary,    secondary: COLORS.millerSecondary,    light: COLORS.millerLight,    text: COLORS.millerText },
  Corporate: { primary: COLORS.corporatePrimary, secondary: COLORS.corporateSecondary, light: COLORS.corporateLight, text: COLORS.corporateText },
};

// All statuses the backend can send
// NOTE: Multiple buyers can now negotiate simultaneously — no "locked" status exists anymore.
const STATUS_CONFIG = {
  pending:        { label: 'Awaiting Your Response', color: '#3182CE', bg: '#EBF8FF' },
  countered:      { label: 'In Negotiation',         color: '#DD6B20', bg: '#FFFAF0' },
  in_negotiation: { label: 'In Negotiation',         color: '#DD6B20', bg: '#FFFAF0' },
  negotiating:    { label: 'In Negotiation',         color: '#DD6B20', bg: '#FFFAF0' },
  accepted:       { label: 'Deal Closed',            color: '#38A169', bg: '#F0FFF4' },
  rejected:       { label: 'Rejected',               color: '#E53E3E', bg: '#FFF5F5' },
  expired:        { label: 'Expired',                color: '#718096', bg: '#EDF2F7' },
  sold:           { label: 'Sold',                   color: '#38A169', bg: '#F0FFF4' },
  cancelled:      { label: 'Cancelled',              color: '#718096', bg: '#EDF2F7' },
};

function normalizeStatus(st) {
  if (!st || typeof st !== 'string') return 'pending';
  return st.toLowerCase().replace(/\s+/g, '_');
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '--';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TERMINAL_STATUSES = ['accepted', 'rejected', 'expired', 'sold', 'cancelled'];

function isTerminalOffer(o) {
  return TERMINAL_STATUSES.includes(normalizeStatus(o.status));
}

export default function ReceivedOffersModal({ visible, onClose, item }) {
  const navigation = useNavigation();
  // PERFORMANCE FIX: Two granular selectors — ReceivedOffersModal only re-renders
  // when user or selectedRole change, not on profileLoading or other auth fields.
  const user      = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);

  const loadOffers = useCallback(async (isRefresh = false, isBackground = false) => {
    if (!item?.id) {
      setApiError('No commodity ID provided.');
      if (!isBackground) setLoading(false);
      return;
    }
    try {
      if (!isBackground) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
      }
      setApiError(null);

      const res = await getReceivedOffers(item.id);
      const list = res?.data?.offers || res?.offers || [];
      setOffers(list);
    } catch (err) {
      console.error('[ReceivedOffers] loadOffers error:', err);
      if (!isBackground) {
        setApiError(err?.message || 'Failed to load received offers.');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [item?.id]);

  useEffect(() => {
    if (visible && item?.id) {
      loadOffers();
      const intervalId = setInterval(() => {
        loadOffers(false, true);
      }, 300000);
      return () => clearInterval(intervalId);
    }
  }, [visible, item?.id, loadOffers]);

  const handleOfferPress = (offer) => {
    onClose();
    navigation.navigate('NegotiationDetails', {
      offer,
      item,
      role: 'seller',
    });
  };

  if (!visible || !item) return null;

  // Deduplicate by ID
  const uniqueOffers = Array.from(new Map(offers.map(o => [o.id || o._id, o])).values());

  // Split: active (non-terminal) vs closed (terminal)
  // All active buyers can negotiate simultaneously — no locking
  const activeOffers   = uniqueOffers.filter(o => !isTerminalOffer(o));
  const closedOffers   = uniqueOffers.filter(o => isTerminalOffer(o));

  // Sort active: seller's turn first (isMyTurn), then by most recent
  const sortedActive = [...activeOffers].sort((a, b) => {
    const aMyTurn = a.currentTurn === 'seller' ? 0 : 1;
    const bMyTurn = b.currentTurn === 'seller' ? 0 : 1;
    if (aMyTurn !== bMyTurn) return aMyTurn - bMyTurn;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // Sort closed: most recent first
  const sortedClosed = [...closedOffers].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  const sortedOffers = [...sortedActive, ...sortedClosed];
  const activeCount = activeOffers.length;
  const myTurnCount = activeOffers.filter(o => o.currentTurn === 'seller').length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.light }}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Received Offers</Text>
            <Text style={styles.headerSubtitle}>{`${item.commodityName}${item.type ? ` (${item.type})` : ''}`}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Loading received offers...</Text>
          </View>
        ) : apiError && offers.length === 0 ? (
          <View style={styles.centeredContainer}>
            <Icon name="alert-circle-outline" size={48} color={COLORS.error} />
            <Text style={styles.errorTitle}>Could Not Load Offers</Text>
            <Text style={styles.errorDesc}>{apiError}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={() => loadOffers()}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary Bar */}
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>My Asking Price</Text>
                <Text style={styles.summaryValue}>
                  {item.sellingPrice ? `₹${item.sellingPrice}/${item.sellingPriceUnit || 'Qt'}` : '—'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Listed Quantity</Text>
                <Text style={styles.summaryValue}>{item.quantity} {item.unit}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Negotiating</Text>
                <Text style={[styles.summaryValue, { color: theme.primary }]}>{activeCount}</Text>
              </View>
            </View>

            {/* Multi-buyer active info strip — shown when >1 buyer is simultaneously negotiating */}
            {activeCount > 1 && (
              <View style={[styles.multiBuyerBanner, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
                <Icon name="account-multiple" size={16} color={theme.primary} />
                <Text style={[styles.multiBuyerText, { color: theme.primary }]}>
                  {activeCount} buyers negotiating simultaneously
                  {myTurnCount > 0 ? ` • ${myTurnCount} awaiting your response` : ''}
                </Text>
              </View>
            )}

            {apiError && offers.length > 0 && (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle-outline" size={15} color={COLORS.white} />
                <Text style={styles.errorBannerText}>{apiError}</Text>
                <TouchableOpacity onPress={() => loadOffers(true)} style={styles.retryBadge}>
                  <Text style={styles.retryBadgeText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => loadOffers(true)} colors={[theme.primary]} tintColor={theme.primary} />
              }
            >
              {/* Active Negotiations Section */}
              {sortedActive.length > 0 && (
                <>
                  <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                    Active Negotiations ({sortedActive.length})
                  </Text>
                  {sortedActive.map((offer) => renderOfferCard(offer, item, theme, handleOfferPress, false))}
                </>
              )}

              {/* Closed / Terminal Section */}
              {sortedClosed.length > 0 && (
                <>
                  <Text style={[styles.sectionHeading, { color: COLORS.textMuted, marginTop: h(16) }]}>
                    Closed ({sortedClosed.length})
                  </Text>
                  {sortedClosed.map((offer) => renderOfferCard(offer, item, theme, handleOfferPress, true))}
                </>
              )}

              {sortedOffers.length === 0 && (
                <View style={styles.emptyState}>
                  <Icon name="inbox-outline" size={56} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No Offers Yet</Text>
                  <Text style={styles.emptyText}>
                    Buyers haven't submitted offers on this listing yet.
                    Share your listing link to attract more buyers.
                  </Text>
                </View>
              )}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// Extracted offer card renderer — keeps JSX clean
function renderOfferCard(offer, item, theme, handleOfferPress, isClosedSection) {
  const isMyTurn     = offer.currentTurn === 'seller';
  const statusSt     = normalizeStatus(offer.status);
  const statusCfg    = STATUS_CONFIG[statusSt] || STATUS_CONFIG.pending;
  const isTerminal   = TERMINAL_STATUSES.includes(statusSt);
  const resolvedCommodity = offer.commodity || (typeof offer.commodityId === 'object' ? offer.commodityId : null) || item;
  const maxRounds    = offer.maxNegotiationRounds || resolvedCommodity?.maxNegotiationRounds || item?.maxNegotiationRounds || 5;

  const buyerObj     = offer.buyerId || offer.buyer || {};
  const buyerFirstName = buyerObj.firstName || '';
  const buyerLastName  = buyerObj.lastName || '';
  const buyerFullName  = (buyerFirstName || buyerLastName) ? `${buyerFirstName} ${buyerLastName}`.trim() : buyerObj.name || 'Buyer';
  const shopName     = buyerObj.shopName || buyerObj.shopname || '';
  const buyerName    = shopName ? `${buyerFullName} (${shopName})` : buyerFullName;
  const buyerState   = buyerObj.state || '';
  const roundCount   = offer.roundCount ?? 0;
  const price        = offer.price ?? 0;
  const qty          = offer.quantity ?? 0;
  const isNegotiable = offer.isNegotiable !== false && item?.isNegotiable !== false && resolvedCommodity?.isNegotiable !== false;
  const showBulletBeforeRound = Boolean(buyerObj.rating || buyerState);

  return (
    <TouchableOpacity
      key={offer.id || offer._id}
      style={[
        styles.offerCard,
        isMyTurn && !isTerminal && styles.myTurnCard,
        isTerminal && styles.terminalCard,
      ]}
      onPress={() => handleOfferPress(offer)}
      activeOpacity={0.85}
    >
      {/* Your Turn Banner — only on active negotiations */}
      {isMyTurn && !isTerminal && (
        <View style={[styles.yourTurnBanner, { backgroundColor: theme.primary }]}>
          <Icon name="bell-ring" size={13} color={COLORS.white} />
          <Text style={styles.yourTurnText}>Your Turn — Respond Now</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.buyerName}>{buyerName}</Text>
          <View style={styles.buyerMeta}>
            {buyerObj.rating && (
              <>
                <Icon name="star" size={12} color="#D69E2E" />
                <Text style={styles.buyerMetaText}>{buyerObj.rating}</Text>
                {buyerState ? <Text style={styles.buyerMetaText}>• {buyerState}</Text> : null}
              </>
            )}
            {!buyerObj.rating && buyerState && (
              <Text style={styles.buyerMetaText}>{buyerState}</Text>
            )}
            {isNegotiable && (
              <Text style={styles.buyerMetaText}>
                {showBulletBeforeRound ? '• ' : ''}Round {roundCount}/{maxRounds}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.offerMetrics}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Price Proposed</Text>
          <Text style={[styles.metricValue, { color: !isTerminal ? theme.primary : COLORS.text }]}>₹{price}/{item.sellingPriceUnit || 'Qt'}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Quantity</Text>
          <Text style={styles.metricValue}>{qty} {item.unit || 'Ton'}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total Value</Text>
          <Text style={styles.metricValue}>₹{(price * qty).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerInfo}>
          <Icon name="truck-delivery" size={14} color={COLORS.textLight} />
          <Text style={styles.footerInfoText}>
            {offer.tradeType === 'FOR' || offer.tradeType === 'for' ? 'FOR Delivery' : 'Ex-Warehouse'}
          </Text>
        </View>
        <View style={styles.footerInfo}>
          <Icon name="clock-outline" size={14} color={COLORS.textLight} />
          <Text style={styles.footerInfoText}>{formatRelativeTime(offer.createdAt)}</Text>
        </View>
      </View>

      {offer.remarks && !isTerminal && (
        <View style={styles.remarksBlock}>
          <Text style={styles.remarksLabel}>Note:</Text>
          <Text style={styles.remarksText} numberOfLines={1}>"{offer.remarks}"</Text>
        </View>
      )}

      {!isTerminal && (
        <View style={[
          styles.ctaRow,
          { backgroundColor: isMyTurn ? theme.primary + '0F' : '#F8F9FA' },
        ]}>
          {isMyTurn && (
            <Icon name="gesture-tap-button" size={14} color={theme.primary} style={{ marginRight: w(4) }} />
          )}
          <Text style={[styles.ctaText, { color: isMyTurn ? theme.primary : COLORS.textMuted }]}>
            {isMyTurn ? 'Tap to Respond' : 'View Negotiation Thread'}
          </Text>
          <Icon name="chevron-right" size={18} color={isMyTurn ? theme.primary : COLORS.textMuted} />
        </View>
      )}
      {isTerminal && (
        <View style={[styles.ctaRow, { backgroundColor: '#F8F9FA' }]}>
          <Text style={[styles.ctaText, { color: COLORS.textMuted }]}>View Thread History</Text>
          <Icon name="chevron-right" size={18} color={COLORS.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: w(16),
    paddingTop: h(16),
  },
  backBtn: {
    marginRight: w(16),
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: f(18),
    fontWeight: '800',
  },
  headerSubtitle: {
    color: COLORS.white,
    fontSize: f(12),
    opacity: 0.9,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: h(12),
    padding: w(20),
  },
  loadingText: {
    fontSize: f(13),
    color: COLORS.textMuted,
  },
  errorTitle: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.text,
    marginTop: h(8),
  },
  errorDesc: {
    fontSize: f(12),
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: h(18),
  },
  retryBtn: {
    paddingHorizontal: w(28),
    paddingVertical: h(12),
    borderRadius: 10,
    marginTop: h(8),
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(13),
  },
  errorBanner: {
    backgroundColor: COLORS.error,
    paddingVertical: h(8),
    paddingHorizontal: w(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
  },
  errorBannerText: {
    color: COLORS.white,
    fontSize: f(12),
    flex: 1,
  },
  retryBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 4,
  },
  retryBadgeText: {
    color: COLORS.white,
    fontSize: f(11),
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: h(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: h(4),
  },
  summaryLabel: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginBottom: h(2),
  },
  summaryValue: {
    fontSize: f(13),
    fontWeight: '800',
    color: COLORS.text,
  },
  multiBuyerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    paddingHorizontal: w(16),
    paddingVertical: h(10),
    borderBottomWidth: 1,
  },
  multiBuyerText: {
    fontSize: f(12),
    fontWeight: '700',
    flex: 1,
  },
  scrollContent: {
    padding: w(16),
    paddingBottom: h(30),
  },
  sectionHeading: {
    fontSize: f(13),
    fontWeight: '800',
    marginBottom: h(12),
    marginTop: h(4),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: h(60),
    gap: h(8),
  },
  emptyTitle: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: f(12),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: h(18),
    paddingHorizontal: w(20),
  },
  offerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(14),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
  },
  myTurnCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3182CE',
    borderColor: '#BEE3F8',
  },
  terminalCard: {
    opacity: 0.75,
  },
  yourTurnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
    marginHorizontal: -w(16),
    marginTop: -h(16),
    paddingHorizontal: w(16),
    paddingVertical: h(6),
    marginBottom: h(12),
  },
  yourTurnText: {
    color: COLORS.white,
    fontSize: f(11),
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: h(4),
  },
  buyerName: {
    fontSize: f(15),
    fontWeight: '800',
    color: COLORS.text,
  },
  buyerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    marginTop: h(2),
    flexWrap: 'wrap',
  },
  buyerMetaText: {
    fontSize: f(11),
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 8,
    marginLeft: w(8),
  },
  statusText: {
    fontSize: f(10),
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F3F5',
    marginVertical: h(12),
  },
  offerMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: w(10),
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: h(12),
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginBottom: h(2),
    textAlign: 'center',
  },
  metricValue: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(10),
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
  },
  footerInfoText: {
    fontSize: f(11),
    color: COLORS.textLight,
  },
  remarksBlock: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: w(8),
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: h(10),
    flexDirection: 'row',
    gap: w(4),
  },
  remarksLabel: {
    fontSize: f(11),
    fontWeight: '700',
    color: '#D97706',
  },
  remarksText: {
    fontSize: f(11),
    color: '#78350F',
    flex: 1,
  },
  ctaRow: {
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: h(8),
    gap: w(4),
  },
  ctaText: {
    fontSize: f(12),
    fontWeight: '800',
  },
});
