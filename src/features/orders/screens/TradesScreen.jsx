import React, { useEffect, useCallback, useMemo, useReducer, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import ReceivedOffersModal from '../../marketplace/components/ReceivedOffersModal';
import StatusFilterTooltip from '../components/StatusFilterTooltip';
import { w, h, f } from '../../../shared/utils/responsive';
import { getOffers, getReceivedOffers, getSellCommodities } from '../../marketplace/marketplace.api';
import { getMySubmittedQuotes } from '../orders.service';
import { showAlert } from '../../../shared/components/CustomAlertBox';

import { getFriendlyErrorMessage } from '../../../shared/utils/errorUtils';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { ROLE_THEMES } from '../../../theme/roleThemes';
import { lookupDealId } from '../../../shared/utils/dealIdRegistry';

const OFFER_STATUS_CONFIG = {
  pending:        { label: 'Awaiting Response',  color: '#718096', bg: '#EDF2F7',  icon: 'clock-outline' },
  in_negotiation: { label: 'In Negotiation',     color: '#6B46C1', bg: '#FAF5FF',  icon: 'swap-horizontal' },
  negotiating:    { label: 'In Negotiation',     color: '#6B46C1', bg: '#FAF5FF',  icon: 'swap-horizontal' },
  countered:      { label: 'Counter Received',   color: '#3182CE', bg: '#EBF8FF',  icon: 'swap-horizontal' },
  accepted:       { label: 'Deal Closed',        color: '#38A169', bg: '#F0FFF4',  icon: 'check-decagram' },
  rejected:       { label: 'Rejected',           color: '#E53E3E', bg: '#FFF5F5',  icon: 'close-circle' },
  expired:        { label: 'Expired',            color: '#718096', bg: '#EDF2F7',  icon: 'timer-off' },
  cancelled:      { label: 'Cancelled',          color: '#718096', bg: '#EDF2F7',  icon: 'close-circle' },
};

const ESCROW_STATUS_CONFIG = {
  pending_payment: { label: 'Payment Pending', color: '#3182CE', bg: '#EBF8FF',  icon: 'cash-clock',     progress: 0.1 },
  funded:          { label: 'Funded',          color: '#DD6B20', bg: '#FFFAF0',  icon: 'bank-check',     progress: 0.4 },
  dispatched:      { label: 'In Transit',      color: '#D69E2E', bg: '#FFFFF0',  icon: 'truck-delivery', progress: 0.6 },
  delivered:       { label: 'Delivered',       color: '#38A169', bg: '#F0FFF4',  icon: 'package-check',  progress: 0.8 },
  released:        { label: 'Completed ✓',     color: '#38A169', bg: '#F0FFF4',  icon: 'check-decagram', progress: 1.0 },
  cancelled:       { label: 'Cancelled',       color: '#E53E3E', bg: '#FFF5F5',  icon: 'close-circle',   progress: 0.0 },
};

const LISTING_STATUS_CONFIG = {
  active:    { label: 'ACTIVE',    color: '#38A169', bg: '#F0FFF4', icon: 'store' },
  sold:      { label: 'SOLD',      color: '#6B46C1', bg: '#FAF5FF', icon: 'check-decagram' },
  expired:   { label: 'EXPIRED',   color: '#718096', bg: '#EDF2F7', icon: 'timer-off' },
  cancelled: { label: 'CANCELLED', color: '#E53E3E', bg: '#FFF5F5', icon: 'close-circle' },
};

// ─── Accordion Section Configs ────────────────────────────────────────────────
const BUY_SECTION_CONFIGS = [
  { key: 'your_turn', label: 'Your Turn to Respond', icon: 'flash',                urgent: true,  accentColor: null /* theme.primary at runtime */ },
  { key: 'waiting',   label: 'Awaiting Response',    icon: 'timer-sand',            urgent: false, accentColor: '#64748B' },
  { key: 'accepted',  label: 'Deals Accepted',        icon: 'check-decagram',        urgent: false, accentColor: '#38A169' },
  { key: 'closed',    label: 'Inactive Offers',       icon: 'archive-outline',       urgent: false, accentColor: '#94A3B8' },
  { key: 'deleted',   label: 'Listing Removed',       icon: 'alert-circle-outline',  urgent: false, accentColor: '#E53E3E' },
];

const SELL_SECTION_CONFIGS = [
  { key: 'active', label: 'Active Listings',     icon: 'storefront-outline',   urgent: false, accentColor: '#38A169' },
  { key: 'sold',   label: 'Sold — Deals Closed', icon: 'check-decagram',       urgent: false, accentColor: null /* theme.primary */ },
  { key: 'closed', label: 'Inactive Listings',   icon: 'archive-outline',      urgent: false, accentColor: '#94A3B8' },
];

function classifyBuyOffer(offer, userRole) {
  const st = normalizeStatus(offer.displayStatus || offer.status);
  const isTerminal = ['accepted', 'rejected', 'expired', 'cancelled'].includes(st);

  const reqObj = (offer.requirementId && typeof offer.requirementId === 'object') ? offer.requirementId : null;
  const commodity = offer.commodity || 
                    (typeof offer.commodityId === 'object' ? offer.commodityId : null) || 
                    reqObj || 
                    {};

  const isDeleted = !commodity.commodityName && !commodity.name && !commodity.commodity;
  if (isDeleted) return 'deleted';
  if (st === 'accepted') return 'accepted';
  if (isTerminal) return 'closed';

  // Role-aware turn verification:
  // FPO (Buyer) is 'buyer', Traders/Millers/Corporates (Sellers) are 'seller'
  const isBuyerRole = userRole === 'FPO';
  const myTurnValue = isBuyerRole ? 'buyer' : 'seller';

  if (offer.currentTurn === myTurnValue) return 'your_turn';
  return 'waiting';
}

function classifySellListing(listing) {
  const st = (listing.status || 'active').toLowerCase();
  if (st === 'sold') return 'sold';
  if (['expired', 'cancelled'].includes(st)) return 'closed';
  return 'active';
}

const BUY_TAB_FILTERS  = ['All', 'Active', 'In Negotiation', 'Accepted', 'Closed'];
const SELL_TAB_FILTERS = ['All', 'Active', 'In Negotiation', 'Sold', 'Closed'];

function formatRelative(dateStr, t) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h_ = Math.floor(diff / 3600000);
  if (h_ < 1) return t ? t('Just now') : 'Just now';
  if (h_ < 24) return t ? t('{hours}h ago').replace('{hours}', String(h_)) : `${h_}h ago`;
  const d = Math.floor(h_ / 24);
  return t ? t('{days}d ago').replace('{days}', String(d)) : `${d}d ago`;
}

function normalizeStatus(st) {
  if (!st || typeof st !== 'string') return 'pending';
  return st.toLowerCase().replace(/\s+/g, '_');
}

function formatExpiry(expiresAt, t) {
  if (!expiresAt) return null;
  const diff = Math.max(0, new Date(expiresAt) - Date.now());
  if (diff === 0) return t ? t('Expired') : 'Expired';
  const h_ = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h_ > 0) return t ? t('Expires in {hours}h {mins}m').replace('{hours}', String(h_)).replace('{mins}', String(m)) : `Expires in ${h_}h ${m}m`;
  return t ? t('Expires in {mins}m').replace('{mins}', String(m)) : `Expires in ${m}m`;
}

const INITIAL_STATE = {
  tradeMode:             'buy',
  activeTab:             'Active',
  selectedCrop:          'All',
  offers:                [],
  sellListings:          [],
  loading:               true,
  refreshing:            false,
  apiError:              null,
  backendCrash:          false,
  selectedOfferForModal: null,
};

function tradesReducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, tradeMode: action.mode, selectedCrop: 'All', activeTab: 'Active' };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab, selectedCrop: 'All' };
    case 'SET_CROP':
      return { ...state, selectedCrop: action.crop };
    case 'FETCH_START':
      return { ...state, loading: true, apiError: null, backendCrash: false };
    case 'REFRESH_START':
      return { ...state, refreshing: true, apiError: null, backendCrash: false };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        offers:       action.offers,
        sellListings: action.sellListings,
        loading:      false,
        refreshing:   false,
        apiError:     null,
        backendCrash: false,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        loading:      false,
        refreshing:   false,
        apiError:     action.error,
        backendCrash: false,
      };
    case 'BACKEND_CRASH':
      return {
        ...state,
        loading:      false,
        refreshing:   false,
        apiError:     null,
        backendCrash: true,
        offers:       [],
        sellListings: [],
      };
    case 'SET_MODAL_OFFER':
      return { ...state, selectedOfferForModal: action.offer };
    default:
      return state;
  }
}




export default function TradesScreen({ navigation, route }) {
  const { t } = useTranslation();
  // PERFORMANCE FIX: Two granular selectors — TradesScreen only re-renders
  // when user or selectedRole change (not profileLoading, sendOtpError, etc.).
  const user      = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const [state, dispatch] = useReducer(tradesReducer, INITIAL_STATE);
  const {
    tradeMode, activeTab, selectedCrop, offers, sellListings,
    loading, refreshing, apiError, backendCrash, selectedOfferForModal,
  } = state;

  // Accordion expand/collapse state — {} means all sections open by default
  const [expandedSections, setExpandedSections] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const loadingRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const loadData = useCallback(async (isRefresh = false, isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const thisGeneration = ++fetchGenerationRef.current;

    try {
      if (!isBackground) {
        if (!isMountedRef.current) return;
        if (isRefresh) dispatch({ type: 'REFRESH_START' });
        else           dispatch({ type: 'FETCH_START' });
      }

      // Services now return normalized arrays directly — no more response guessing
      // Services now return normalized arrays directly — no more response guessing
      const [offersListRaw, submittedQuotesRaw, sellList] = await Promise.all([
        getOffers({ page: 1, limit: 50 }, { signal: controller.signal }),
        getMySubmittedQuotes({ sellerId: user?.id || user?._id }, { signal: controller.signal }),
        getSellCommodities({ sellerId: user?.id || user?._id }, { signal: controller.signal }),
      ]);

      // Merge: buy-commodity offers & submitted requirement quotes (dedupe by id)
      const combinedOffers = [...(offersListRaw || []), ...(submittedQuotesRaw || [])];
      const seen = new Set();
      const offersList = combinedOffers.filter(o => {
        const key = o?.id || o?._id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (thisGeneration !== fetchGenerationRef.current) return;
      if (!isMountedRef.current) return;

      // Enrich sold listings with their accepted deal ID
      const soldListings = sellList.filter(l => l.status === 'sold');
      let enrichedSellListings = sellList;

      if (soldListings.length > 0) {
        enrichedSellListings = await Promise.all(
          sellList.map(async (listing) => {
            if (listing.status !== 'sold') return listing;
            try {
              // getReceivedOffers returns normalized offer[] — use offer.id, offer.dealId directly
              const offers = await getReceivedOffers(listing.id, { signal: controller.signal });
              if (thisGeneration !== fetchGenerationRef.current) return listing;
              const acceptedOffer = offers.find(o => o.status === 'accepted');
              return {
                ...listing,
                _dealId: acceptedOffer?.dealId || acceptedOffer?.deal?._id || null,
                _acceptedOffer: acceptedOffer || null,
              };
            } catch {
              return listing;
            }
          })
        );
      }

      if (thisGeneration !== fetchGenerationRef.current) return;
      if (!isMountedRef.current) return;

      dispatch({
        type: 'FETCH_SUCCESS',
        offers: offersList,
        sellListings: enrichedSellListings,
      });
      lastFetchTimeRef.current = Date.now();

    } catch (err) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;

      if (__DEV__) {
        console.error('[TradesScreen] loadData error:', err);
      } else {
        console.error('[Production TradesScreen] loadData error:', {
          message: err?.message || String(err),
          status: err?.response?.status,
          code: err?.code,
          url: err?.config?.url,
        });
      }

      if (!isMountedRef.current) return;

      const rawMsg = err?.response?.data?.message || err?.message || String(err);
      const errMsg = getFriendlyErrorMessage(rawMsg);

      if (rawMsg.includes("reading '_id'") || rawMsg.includes('null')) {
        dispatch({ type: 'BACKEND_CRASH' });
      } else {
        dispatch({ type: 'FETCH_ERROR', error: errMsg });
        if (isRefresh) {
          showAlert({ type: 'error', title: 'Refresh Failed', message: errMsg });
        }
      }
    } finally {
      if (thisGeneration === fetchGenerationRef.current) {
        isFetchingRef.current = false;
      }
    }
  }, [user?._id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      const cacheExpiry = 30_000;
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      const shouldRefresh = route.params?.shouldRefresh;

      if (loadingRef.current || shouldRefresh || timeSinceLastFetch > cacheExpiry) {
        loadData();
        if (shouldRefresh) {
          navigation.setParams({ shouldRefresh: null });
        }
      }

      const intervalId = setInterval(() => {
        // Guard: only refresh if still mounted (prevents teardown crash)
        if (isMountedRef.current) {
          loadData(false, true);
        } else {
          clearInterval(intervalId);
        }
      }, 300000);

      return () => {
        clearInterval(intervalId);
        abortControllerRef.current?.abort();
      };
    }, [loadData, route.params?.shouldRefresh, navigation])
  );

  const uniqueOffers = useMemo(() => {
    return Array.from(new Map(
      offers.filter(Boolean).map(o => [o.id || o._id, o])
    ).values());
  }, [offers]);

  const statusFilteredOffers = useMemo(() => {
    return uniqueOffers.filter(offer => {
      const st = normalizeStatus(offer.displayStatus || offer.status);
      if (activeTab === 'Active') return ['pending', 'in_negotiation', 'negotiating', 'countered'].includes(st);
      if (activeTab === 'In Negotiation') return ['in_negotiation', 'negotiating', 'countered'].includes(st);
      if (activeTab === 'Accepted') return st === 'accepted';
      if (activeTab === 'Closed') return ['rejected', 'expired', 'cancelled'].includes(st);
      return true; // 'All'
    });
  }, [uniqueOffers, activeTab]);

  const statusFilteredSellListings = useMemo(() => {
    return sellListings.filter(listing => {
      const st = (listing.status || 'active').toLowerCase();
      if (activeTab === 'Active') return st === 'active';
      if (activeTab === 'In Negotiation') return st === 'active' && listing.isNegotiable !== false;
      if (activeTab === 'Accepted' || activeTab === 'Sold') return st === 'sold';
      if (activeTab === 'Closed') return ['expired', 'cancelled'].includes(st);
      return true; // 'All'
    });
  }, [sellListings, activeTab]);

  const cropChips = useMemo(() => {
    if (tradeMode === 'buy') {
      return ['All', ...Array.from(new Set(statusFilteredOffers.map(o => {
        const reqObj = (o.requirementId && typeof o.requirementId === 'object') ? o.requirementId : null;
        const commodity = o.commodity || (typeof o.commodityId === 'object' ? o.commodityId : null) || reqObj || {};
        return commodity.commodityName || commodity.name || commodity.commodity;
      }).filter(Boolean)))];
    } else {
      return ['All', ...Array.from(new Set(statusFilteredSellListings.map(l => {
        return l.commodityName || l.name;
      }).filter(Boolean)))];
    }
  }, [tradeMode, statusFilteredOffers, statusFilteredSellListings]);

  const filteredOffers = useMemo(() => {
    return statusFilteredOffers.filter(offer => {
      const reqObj = (offer.requirementId && typeof offer.requirementId === 'object') ? offer.requirementId : null;
      const commodity = offer.commodity || (typeof offer.commodityId === 'object' ? offer.commodityId : null) || reqObj || {};
      const cropName = commodity.commodityName || commodity.name || commodity.commodity || '';
      return selectedCrop === 'All' || cropName === selectedCrop;
    });
  }, [statusFilteredOffers, selectedCrop]);

  const filteredSellListings = useMemo(() => {
    return statusFilteredSellListings.filter(listing => {
      const cropName = listing.commodityName || listing.name || '';
      return selectedCrop === 'All' || cropName === selectedCrop;
    });
  }, [statusFilteredSellListings, selectedCrop]);

  // ─── Grouped + typed flat array for accordion FlatList ───────────────────────
  const groupedListData = useMemo(() => {
    const result = [];

    if (tradeMode === 'buy') {
      const groups = {};
      for (const offer of filteredOffers) {
        const key = classifyBuyOffer(offer, selectedRole);
        if (!groups[key]) groups[key] = [];
        groups[key].push(offer);
      }
      for (const cfg of BUY_SECTION_CONFIGS) {
        const items = groups[cfg.key];
        if (!items?.length) continue;
        const accentColor = cfg.key === 'your_turn' ? theme.primary : (cfg.accentColor || theme.primary);
        // Smart Default: expand "your_turn" section by default if the user hasn't toggled it yet
        const isExpanded = expandedSections[cfg.key] ?? (cfg.key === 'your_turn');
        result.push({
          type: 'section_header',
          sectionKey: cfg.key,
          label: cfg.label,
          icon: cfg.icon,
          accentColor,
          urgent: cfg.urgent,
          count: items.length,
          isExpanded,
        });
        if (isExpanded) {
          for (const item of items) {
            result.push({ type: 'buy_card', item });
          }
        }
      }
    } else {
      const groups = {};
      for (const listing of filteredSellListings) {
        const key = classifySellListing(listing);
        if (!groups[key]) groups[key] = [];
        groups[key].push(listing);
      }
      for (const cfg of SELL_SECTION_CONFIGS) {
        const items = groups[cfg.key];
        if (!items?.length) continue;
        const accentColor = cfg.key === 'sold' ? theme.primary : (cfg.accentColor || theme.primary);
        // Smart Default: expand "active" listing section by default if the user hasn't toggled it yet
        const isExpanded = expandedSections[cfg.key] ?? (cfg.key === 'active');
        result.push({
          type: 'section_header',
          sectionKey: cfg.key,
          label: cfg.label,
          icon: cfg.icon,
          accentColor,
          urgent: cfg.urgent,
          count: items.length,
          isExpanded,
        });
        if (isExpanded) {
          for (const item of items) {
            result.push({ type: 'sell_card', item });
          }
        }
      }
    }

    return result;
  }, [filteredOffers, filteredSellListings, expandedSections, tradeMode, theme.primary]);

  const handleOfferPress = useCallback((offer) => {
    const offerId = offer.id || offer._id || null;
    const dealId = offer.dealId || offer.deal?._id || (typeof offer.deal === 'string' ? offer.deal : null) || lookupDealId(offerId) || null;
    const resolvedCommodity = offer.commodity || 
                             (typeof offer.commodityId === 'object' ? offer.commodityId : null) || 
                             (typeof offer.requirementId === 'object' ? offer.requirementId : null) ||
                             {};
    const isSeller = user && offer.sellerId && String(offer.sellerId) === String(user._id || user.id);
    const resolvedRole = isSeller ? 'seller' : 'buyer';

    if (offer.status === 'accepted') {
      navigation.navigate('DealDetails', {
        deal: offer.deal || offer,
        dealId,
        offerId,
        item: resolvedCommodity,
        role: resolvedRole,
      });
    } else {
      navigation.navigate('NegotiationDetails', {
        offer: { id: offer.id || offer._id, ...offer },
        item: resolvedCommodity,
        role: resolvedRole
      });
    }
  }, [navigation, user]);

  const toggleSection = useCallback((sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);

  const renderItem = useCallback(({ item, index }) => {
    if (item.type === 'section_header') {
      const { sectionKey, label, icon, accentColor, count, isExpanded } = item;
      return (
        <TouchableOpacity
          key={`header-${sectionKey}`}
          style={[styles.sectionAccordionHeader, { borderColor: accentColor + '30' }]}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.8}
        >
          <View style={styles.sectionAccordionLeft}>
            <View style={[styles.sectionIconBg, { backgroundColor: accentColor + '12' }]}>
              <Icon name={icon} size={16} color={accentColor} />
            </View>
            <Text style={[styles.sectionAccordionTitle, { color: '#1A202C' }]}>
              {t(label)}
            </Text>
          </View>
          <View style={styles.sectionAccordionRight}>
            <View style={[styles.sectionCountBadgeCompact, { backgroundColor: accentColor + '18' }]}>
              <Text style={[styles.sectionCountTextCompact, { color: accentColor }]}>{count}</Text>
            </View>
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#718096"
              style={{ marginLeft: w(4) }}
            />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'buy_card') {
      const offer = item.item;
      const displaySt = normalizeStatus(offer.displayStatus || offer.status);
      const baseStatusCfg = OFFER_STATUS_CONFIG[displaySt] || OFFER_STATUS_CONFIG.pending;
      const statusCfg = {
        ...baseStatusCfg,
        color: ['in_negotiation', 'negotiating', 'countered', 'accepted'].includes(displaySt) ? theme.primary : baseStatusCfg.color,
        bg: ['in_negotiation', 'negotiating', 'countered', 'accepted'].includes(displaySt) ? theme.primary + '15' : baseStatusCfg.bg,
      };
      
      const isMyTurn = offer.currentTurn === (selectedRole === 'FPO' ? 'buyer' : 'seller');
      const isTerminal = ['accepted', 'rejected', 'expired', 'cancelled'].includes(displaySt);
      const history = offer.negotiationHistory || offer.rounds || [];
      const lastRound = history[history.length - 1];
      const lastPrice = lastRound?.price || offer.price || 0;
      const qty = offer.quantity || 0;
      const reqObj = (offer.requirementId && typeof offer.requirementId === 'object') ? offer.requirementId : null;
      const commodity = offer.commodity || 
                        (typeof offer.commodityId === 'object' ? offer.commodityId : null) || 
                        reqObj || 
                        {};
      const expiry = formatExpiry(offer.expiresAt, t);
      
      const isDeletedListing = !commodity.commodityName && !commodity.name && !commodity.commodity;

      return (
        <TouchableOpacity
          key={`buy-${offer.id || offer._id || index}`}
          style={[
            styles.compactCard,
            {
              borderColor: isMyTurn && !isTerminal
                ? theme.primary
                : ['in_negotiation', 'negotiating', 'countered'].includes(displaySt) && !isTerminal
                ? theme.primary + '80'
                : '#E2E8F0',
              borderWidth: isMyTurn && !isTerminal ? 1.8 : 1,
            },
          ]}
          onPress={() => {
            if (isDeletedListing) {
              showAlert({
                type: 'warning',
                title: t('Listing Removed'),
                message: t('The seller has deleted this commodity listing. This negotiation is no longer active.')
              });
              return;
            }
            handleOfferPress(offer);
          }}
          activeOpacity={0.85}
        >
          {isMyTurn && !isTerminal && (
            <View style={[styles.compactUrgentStrip, { backgroundColor: theme.primary }]}>
              <Icon name="flash" size={10} color={COLORS.white} style={{ marginRight: w(4) }} />
              <Text style={styles.compactUrgentText}>{t('Your Turn — Respond Now')}</Text>
            </View>
          )}

          <View style={styles.compactCardBody}>
            <View style={styles.compactCardLeft}>
              <View style={styles.compactCardTitleRow}>
                <Text style={styles.compactCropTitle} numberOfLines={1}>
                  {commodity.commodityName || commodity.name || commodity.commodity || t('Listing Removed')}
                  {commodity.type ? ` (${commodity.type})` : ''}
                </Text>
                {commodity.state && (
                  <Text style={styles.compactLocationText} numberOfLines={1}>
                    • {commodity.state}
                  </Text>
                )}
              </View>

              <View style={styles.compactBidDetailsRow}>
                <Text style={styles.compactBidLabel}>
                  {t('Bid:')} <Text style={[styles.compactBidValue, { color: theme.primary }]}>₹{offer.price}</Text>
                </Text>
                {lastPrice !== offer.price && (
                  <Text style={styles.compactBidLabel}>
                    {t('Latest:')} <Text style={[styles.compactBidValue, { color: '#DD6B20' }]}>₹{lastPrice}</Text>
                  </Text>
                )}
                <Text style={styles.compactBidLabel}>
                  {t('Qty:')} <Text style={styles.compactBidValue}>{qty} {offer.unit || 'Ton'}</Text>
                </Text>
              </View>

              <View style={styles.compactMetaRow}>
                {offer.roundCount != null && (
                  <Text style={styles.compactMetaText}>
                    Rnd {offer.roundCount}/{offer.maxNegotiationRounds || 5}
                  </Text>
                )}
                {expiry && !isTerminal && (
                  <Text style={[styles.compactMetaText, { color: '#D69E2E', fontWeight: '700' }]}>
                    {expiry}
                  </Text>
                )}
                <Text style={styles.compactMetaText}>
                  {formatRelative(offer.createdAt, t)}
                </Text>
              </View>
            </View>

            <View style={styles.compactCardRight}>
              <View style={[styles.compactStatusPill, { backgroundColor: statusCfg.bg }]}>
                <Text style={[styles.compactStatusPillText, { color: statusCfg.color }]}>
                  {t(statusCfg.label)}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color="#718096" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'sell_card') {
      const listing = item.item;
      const id = listing._id || listing.id;
      if (!id) return null;

      const rawStatus = (listing.status || 'active').toLowerCase();
      const baseStatusCfg = LISTING_STATUS_CONFIG[rawStatus] || LISTING_STATUS_CONFIG.active;
      const isSold = rawStatus === 'sold';
      const statusCfg = {
        ...baseStatusCfg,
        color: isSold ? theme.primary : baseStatusCfg.color,
        bg: isSold ? theme.primary + '15' : baseStatusCfg.bg,
      };

      const crop = listing.commodityName && listing.commodityName !== '—' ? listing.commodityName : t('Commodity');
      const variety = listing.type || null;
      const quantity = `${listing.quantity ?? '?'} ${listing.unit || ''}`.trim();
      const price = listing.sellingPrice != null ? String(listing.sellingPrice) : 'N/A';
      const priceUnit = listing.sellingPriceUnit || 'Qt';
      const location = listing.commodityLocation && listing.commodityLocation !== '—' ? listing.commodityLocation : t('Location Not Specified');
      
      const handlePress = () => {
        if (isSold) {
          const offerId = listing._acceptedOffer?.id || listing._acceptedOffer?._id || null;
          const dealId = listing._dealId || listing.dealId || listing._acceptedOffer?.dealId || lookupDealId(offerId) || null;
          navigation.navigate('DealDetails', {
            deal: listing._acceptedOffer || listing,
            dealId,
            offerId,
            item: { id, commodityName: crop, type: variety, ...listing },
            role: 'seller',
          });
        } else {
          dispatch({ type: 'SET_MODAL_OFFER', offer: { id, commodityName: crop, type: variety, ...listing } });
        }
      };

      return (
        <TouchableOpacity
          key={`sell-${id}`}
          style={[
            styles.compactCard,
            { borderColor: isSold ? theme.primary + '80' : '#E2E8F0', borderWidth: isSold ? 1.5 : 1 }
          ]}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <View style={styles.compactCardBody}>
            <View style={styles.compactCardLeft}>
              <View style={styles.compactCardTitleRow}>
                <Text style={styles.compactCropTitle} numberOfLines={1}>
                  {crop}{variety ? ` (${variety})` : ''}
                </Text>
                {location && (
                  <Text style={styles.compactLocationText} numberOfLines={1}>
                    • {location}
                  </Text>
                )}
              </View>

              <View style={styles.compactBidDetailsRow}>
                <Text style={styles.compactBidLabel}>
                  {t('Price:')} <Text style={[styles.compactBidValue, { color: theme.primary }]}>₹{price}/{priceUnit}</Text>
                </Text>
                <Text style={styles.compactBidLabel}>
                  {t('Qty:')} <Text style={styles.compactBidValue}>{quantity}</Text>
                </Text>
              </View>

              <View style={styles.compactMetaRow}>
                {listing.isNegotiable !== false && (
                  <Text style={[styles.compactMetaText, { color: theme.primary, fontWeight: '700' }]}>
                    {t('Negotiable')}
                  </Text>
                )}
                {listing.escrowEnabled && (
                  <Text style={[styles.compactMetaText, { color: '#38A169', fontWeight: '700' }]}>
                    {t('Escrow Secured')}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.compactCardRight}>
              <View style={[styles.compactStatusPill, { backgroundColor: statusCfg.bg }]}>
                <Text style={[styles.compactStatusPillText, { color: statusCfg.color }]}>
                  {t(statusCfg.label)}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color="#718096" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    return null;
  }, [tradeMode, theme, handleOfferPress, navigation, t, toggleSection]);

  const handleRefresh = useCallback(() => loadData(true), [loadData]);

  const flatListStyle = useMemo(() => ({
    backgroundColor: theme.light,
  }), [theme.light]);

  const flatListContentStyle = useMemo(() => [
    styles.listContent,
  ], []);

  const listHeader = useMemo(() => {
    return (
      <View>
        {apiError && (
          <View 
            style={[
              styles.errorBanner, 
              { 
                backgroundColor: theme.primary + '10', 
                borderColor: theme.primary + '25', 
                borderBottomWidth: 1.5 
              }
            ]} 
            accessible={true} 
            accessibilityLabel={t('Notice: {msg}').replace('{msg}', t(apiError))}
          >
            <Icon name="information-outline" size={15} color={theme.primary} />
            <Text style={[styles.errorBannerText, { color: theme.primary, fontWeight: '600' }]}>{t(apiError)}</Text>
            <TouchableOpacity
              onPress={() => loadData(true)}
              style={[styles.retryBadge, { backgroundColor: theme.primary }]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('Retry loading data')}
            >
              <Text style={[styles.retryBadgeText, { color: COLORS.white }]}>{t('Retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Switcher Guide Text */}
        <View style={styles.switcherGuideRow}>
          <Text style={[styles.switcherGuideText, { color: theme.primary }]}>
            {t('Choose your activity')}
          </Text>
        </View>

        <View style={styles.switcherContainer}>
          <TouchableOpacity
            style={[
              styles.switcherBtn,
              tradeMode === 'buy' && {
                borderBottomWidth: 3,
                borderBottomColor: theme.primary,
              },
            ]}
            onPress={() => dispatch({ type: 'SET_MODE', mode: 'buy' })}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('My Bids & Quotes')}
            accessibilityState={{ selected: tradeMode === 'buy' }}
          >
            <Text style={[
              styles.switcherText,
              tradeMode === 'buy' ? { color: theme.primary, fontWeight: '800' } : { color: '#64748B' }
            ]}>
              {t('My Bids & Quotes')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.switcherBtn,
              tradeMode === 'sell' && {
                borderBottomWidth: 3,
                borderBottomColor: theme.primary,
              },
            ]}
            onPress={() => dispatch({ type: 'SET_MODE', mode: 'sell' })}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('My Listings')}
            accessibilityState={{ selected: tradeMode === 'sell' }}
          >
            <Text style={[
              styles.switcherText,
              tradeMode === 'sell' ? { color: theme.primary, fontWeight: '800' } : { color: '#64748B' }
            ]}>
              {t('My Listings')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section label — visual identity separator between switcher and tab filters */}
        <View style={styles.filterLabelRow}>
          <View style={[styles.filterLabelLine, { backgroundColor: theme.primary + '25' }]} />
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowTooltip(true)}
            activeOpacity={0.75}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('Show status filter guide')}
          >
            <Text style={[styles.filterLabelText, { color: theme.primary }]}>
              {t('Filter by Status')}
            </Text>
            <Icon name="information-outline" size={13.5} color={theme.primary} style={{ marginLeft: w(4) }} />
          </TouchableOpacity>
          <View style={[styles.filterLabelLine, { backgroundColor: theme.primary + '25' }]} />
        </View>

        {(() => {
          const tabFilters = tradeMode === 'buy' ? BUY_TAB_FILTERS : SELL_TAB_FILTERS;
          return (
            <View style={styles.tabBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent} keyboardShouldPersistTaps="handled">
                {tabFilters.map(tab => {
                  const isSelected = tab === activeTab;
                  const inNegBadge = tradeMode === 'buy' && tab === 'In Negotiation' &&
                    uniqueOffers.some(o => ['in_negotiation', 'negotiating', 'countered'].includes(normalizeStatus(o.displayStatus || o.status)) && o.currentTurn === (selectedRole === 'FPO' ? 'buyer' : 'seller'));
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.tabChip,
                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                        inNegBadge && { flexDirection: 'row', alignItems: 'center', gap: w(4) }
                      ]}
                      onPress={() => dispatch({ type: 'SET_TAB', tab })}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={t(tab)}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.tabChipText, isSelected && { color: COLORS.white, fontWeight: '800' }]}>
                        {t(tab)}
                      </Text>
                      {inNegBadge && (
                        <View style={styles.urgentDot} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })()}

        {/* Crop Filter Chips */}
        {cropChips.length > 1 && (
          <>
            <View style={styles.filterLabelRow}>
              <View style={[styles.filterLabelLine, { backgroundColor: theme.primary + '25' }]} />
              <Text style={[styles.filterLabelText, { color: theme.primary }]}>
                {t('Filter by Crop / Commodity')}
              </Text>
              <View style={[styles.filterLabelLine, { backgroundColor: theme.primary + '25' }]} />
            </View>
            <View style={styles.cropChipsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cropChipsContent}
              keyboardShouldPersistTaps="handled"
            >
              {cropChips.map(crop => {
                const isSelected = crop === selectedCrop;
                return (
                  <TouchableOpacity
                    key={crop}
                    style={[
                      styles.cropChip,
                      isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => dispatch({ type: 'SET_CROP', crop })}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t('Filter by crop {crop}').replace('{crop}', crop)}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[
                      styles.cropChipText,
                      isSelected && { color: COLORS.white, fontWeight: '700' }
                    ]}>
                      {crop === 'All' ? t('All') : crop}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          </>
        )}

      </View>
    );
  }, [apiError, tradeMode, activeTab, selectedCrop, cropChips, uniqueOffers, theme, loadData, navigation, t]);

  const listEmpty = useMemo(() => {
    if (apiError) return null;
    if (tradeMode === 'buy') {
      if (filteredOffers.length > 0) return null;
      return (
        <View style={styles.emptyState} accessible={true}>
          {backendCrash ? (
            <>
              <Icon name="package-variant-closed-remove" size={80} color="#E53E3E" style={{ opacity: 0.8 }} />
              <Text style={styles.emptyTitle}>{t('Listings Removed')}</Text>
              <Text style={styles.emptyText}>
                {t('The seller has permanently removed this commodity from the marketplace.')}
              </Text>
            </>
          ) : (
            <>
              <Icon name="handshake-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{t('No Offers Found')}</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'All'
                  ? t("You haven't submitted any offers yet.\nBrowse the marketplace to find commodities.")
                  : t('No offers with "{status}" status.').replace('{status}', activeTab)}
              </Text>
            </>
          )}
          {activeTab === 'All' && !backendCrash && (
            <Text style={[styles.emptySubHint, { color: theme.primary }]}>
              {t('Go to Market tab to place offers on listings.')}
            </Text>
          )}
        </View>
      );
    } else {
      if (filteredSellListings.length > 0) return null;
      return (
        <View style={styles.emptyState} accessible={true}>
          <Icon name="store-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'Sold' ? t('No Sold Deals Yet') :
             activeTab === 'In Negotiation' ? t('No Active Negotiations') :
             activeTab === 'Closed' ? t('No Closed Deals') :
             t('No Listings Found')}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'All' || activeTab === 'Active'
              ? t("You haven't listed any crops for sale in the marketplace yet.")
              : t('No listings with this status right now.')}
          </Text>
          {(activeTab === 'All' || activeTab === 'Active') && (
            <Text style={[styles.emptySubHint, { color: theme.primary }]}>
              {t('Use the Sell tab at the bottom to create a new listing.')}
            </Text>
          )}
        </View>
      );
    }
  }, [apiError, tradeMode, filteredOffers.length, filteredSellListings.length, backendCrash, activeTab, theme.primary, navigation, t]);

  const keyExtractor = useCallback((item, index) => {
    if (item.type === 'section_header') {
      return `header-${item.sectionKey}`;
    }
    const inner = item.item || {};
    return `${item.type}-${inner.id || inner._id || index}`;
  }, []);

  if (loading) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t('My Trades')}
          subtitle={t('Your offers, negotiations & deals')}
          showBackButton={false}
        />
        <View style={styles.centeredContainer} accessible={true}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{t('Loading your trades...')}</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={flatListStyle} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title={t('My Trades')}
        subtitle={t('Your offers, negotiations & deals')}
        showBackButton={false}
      />

      <FlatList
        data={groupedListData}
        keyExtractor={keyExtractor}
        contentContainerStyle={flatListContentStyle}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        renderItem={renderItem}
      />

      <ReceivedOffersModal
        visible={!!selectedOfferForModal}
        onClose={() => dispatch({ type: 'SET_MODAL_OFFER', offer: null })}
        item={selectedOfferForModal}
      />

      <StatusFilterTooltip
        visible={showTooltip}
        onClose={() => setShowTooltip(false)}
        theme={theme}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
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
  // Tab Bar
  tabBar: {
    backgroundColor: '#FAFBFF',
    paddingVertical: h(12),
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF4',
  },
  tabBarContent: {
    paddingHorizontal: w(16),
    gap: w(8),
  },
  tabChip: {
    paddingHorizontal: w(18),
    paddingVertical: h(8),
    borderRadius: 22,
    backgroundColor: '#EEF2F7',
    borderWidth: 1.5,
    borderColor: '#D8DFEA',
  },
  tabChipText: {
    fontSize: f(12.5),
    fontWeight: '700',
    color: '#4A5568',
  },
  urgentDot: {
    width: w(6),
    height: w(6),
    borderRadius: w(3),
    backgroundColor: '#E53E3E',
  },
  listContent: {
    padding: w(16),
    paddingBottom: h(30),
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: h(10),
    paddingHorizontal: w(14),
    borderRadius: 12,
    borderWidth: 1.2,
    marginHorizontal: w(16),
    marginTop: h(12),
    marginBottom: h(4),
  },
  compactSoldCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginHorizontal: w(16),
    marginVertical: h(5),
    paddingHorizontal: w(14),
    paddingVertical: h(10),
  },
  compactCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTextContainer: {
    flex: 1,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    marginBottom: h(2),
  },
  compactCropTitle: {
    fontSize: f(13.5),
    fontWeight: '800',
    color: '#2D3748',
  },
  compactInfoSub: {
    fontSize: f(11),
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  compactBuyerSub: {
    fontSize: f(10.5),
    color: '#4A5568',
    fontWeight: '600',
    marginTop: h(2),
  },
  compactChevron: {
    marginLeft: w(8),
  },
  compactStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: w(6),
    paddingVertical: h(2.5),
  },
  compactStatusBadgeText: {
    fontSize: f(9),
    fontWeight: '800',
  },
  compactEscrowBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: w(6),
    paddingVertical: h(2.5),
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactEscrowBadgeText: {
    fontSize: f(9),
    fontWeight: '800',
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accordionTitle: {
    fontSize: f(13),
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  accordionSubtitle: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  accordionBadge: {
    borderRadius: 12,
    paddingHorizontal: w(8),
    paddingVertical: h(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBadgeText: {
    fontSize: f(10.5),
    fontWeight: '800',
    color: COLORS.white,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: w(16),
    marginTop: h(16),
    marginBottom: h(8),
    gap: w(6),
  },
  sectionHeadingText: {
    fontSize: f(13),
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  sectionCountBadge: {
    borderRadius: 12,
    paddingHorizontal: w(8),
    paddingVertical: h(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountBadgeText: {
    fontSize: f(10.5),
    fontWeight: '800',
  },
  // Empty State
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
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
    paddingHorizontal: w(22),
    paddingVertical: h(12),
    borderRadius: 10,
    marginTop: h(8),
  },
  browseBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(13),
  },
  emptySubHint: {
    fontSize: f(12),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: h(4),
    paddingHorizontal: w(20),
  },
  // Offer Card
  offerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  yourTurnBanner: {
    paddingHorizontal: w(16),
    paddingVertical: h(9),
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
  },
  yourTurnDot: {
    width: w(5),
    height: w(5),
    borderRadius: w(3),
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginLeft: w(2),
  },
  yourTurnText: {
    color: COLORS.white,
    fontSize: f(11),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: w(16),
    paddingBottom: h(6),
  },
  cropTitle: {
    fontSize: f(16),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    marginTop: h(4),
  },
  locationText: {
    fontSize: f(11),
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 6,
    marginLeft: w(8),
  },
  statusText: {
    fontSize: f(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Price Strip
  priceStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    marginHorizontal: w(16),
    marginBottom: h(12),
    marginTop: h(6),
    borderRadius: 12,
    paddingVertical: h(10),
    paddingHorizontal: w(8),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '60%',
    alignSelf: 'center',
  },
  priceLabel: {
    fontSize: f(10),
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priceVal: {
    fontSize: f(14),
    fontWeight: '800',
    color: '#0F172A',
    marginTop: h(4),
    textAlign: 'center',
  },
  // Meta Row
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(6),
    paddingHorizontal: w(16),
    marginBottom: h(12),
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    backgroundColor: '#F1F5F9',
    paddingHorizontal: w(10),
    paddingVertical: h(4),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipText: {
    fontSize: f(10),
    color: '#475569',
    fontWeight: '700',
  },
  // Deal block for accepted offers
  dealBlock: {
    marginHorizontal: w(16),
    marginBottom: h(12),
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    padding: w(12),
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
    marginBottom: h(8),
  },
  dealStatus: {
    fontSize: f(12),
    fontWeight: '700',
    color: '#065F46',
  },
  progressTrack: {
    height: h(8),
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  // CTA Row
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: h(12),
    gap: w(6),
    paddingHorizontal: w(16),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ctaText: {
    fontSize: f(12),
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  // Buy/Sell switcher styles
  switcherContainer: {
    flexDirection: 'row',
    marginHorizontal: w(16),
    marginTop: h(2),
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  switcherBtn: {
    flex: 1,
    paddingVertical: h(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherText: {
    fontSize: f(13),
    fontWeight: '600',
  },
  switcherGuideRow: {
    marginHorizontal: w(16),
    marginTop: h(14),
    marginBottom: h(4),
  },
  switcherGuideText: {
    fontSize: f(11),
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Crop Chips filter styles
  cropChipsBar: {
    backgroundColor: COLORS.white,
    paddingVertical: h(8),
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  cropChipsContent: {
    paddingHorizontal: w(16),
    gap: w(6),
  },
  cropChip: {
    paddingHorizontal: w(12),
    paddingVertical: h(6),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  cropChipText: {
    fontSize: f(11),
    color: COLORS.textLight,
    fontWeight: '500',
  },
  // Interned helpers — prevent new JSObject allocation every renderItem call
  cardFlex: {
    flex: 1,
  },
  deletedListingCard: {
    opacity: 0.6,
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  deletedListingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
  },
  buyerMetaRowSold: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(6),
    paddingHorizontal: w(14),
    marginBottom: h(10),
  },

  // ─── Filter Label Divider ─────────────────────────────────────────
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: w(16),
    marginTop: h(14),
    marginBottom: h(2),
    gap: w(10),
  },
  filterLabelLine: {
    flex: 1,
    height: 1,
  },
  filterLabelText: {
    fontSize: f(10),
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ─── Accordion Headers ────────────────────────────────────────────
  sectionAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: w(12),
    paddingVertical: h(10),
    marginTop: h(12),
    marginBottom: h(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionAccordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    flex: 1,
  },
  sectionIconBg: {
    width: w(28),
    height: w(28),
    borderRadius: w(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionAccordionTitle: {
    fontSize: f(13.5),
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  sectionAccordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
  },
  sectionCountBadgeCompact: {
    paddingHorizontal: w(6),
    paddingVertical: h(2),
    borderRadius: 8,
    minWidth: w(18),
    alignItems: 'center',
  },
  sectionCountTextCompact: {
    fontSize: f(10),
    fontWeight: '800',
  },

  // ─── Compact Cards ───────────────────────────────────────────────
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: h(8),
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  compactUrgentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: h(4),
    paddingHorizontal: w(10),
  },
  compactUrgentText: {
    color: '#FFFFFF',
    fontSize: f(9),
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  compactCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: w(12),
    paddingVertical: h(10),
  },
  compactCardLeft: {
    flex: 1,
    gap: h(4),
  },
  compactCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
    marginLeft: w(8),
  },
  compactCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  compactCropTitle: {
    fontSize: f(14),
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  compactLocationText: {
    fontSize: f(11),
    color: '#64748B',
    fontWeight: '500',
    marginLeft: w(4),
  },
  compactBidDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: w(10),
  },
  compactBidLabel: {
    fontSize: f(11),
    color: '#64748B',
    fontWeight: '600',
  },
  compactBidValue: {
    fontWeight: '800',
    color: '#0F172A',
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: w(8),
    marginTop: h(2),
  },
  compactMetaText: {
    fontSize: f(10),
    color: '#94A3B8',
    fontWeight: '600',
  },
  compactStatusPill: {
    paddingHorizontal: w(8),
    paddingVertical: h(3.5),
    borderRadius: 6,
  },
  compactStatusPillText: {
    fontSize: f(9.5),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  
  // ─── Tooltip Styles ───────────────────────────────────────────────
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
