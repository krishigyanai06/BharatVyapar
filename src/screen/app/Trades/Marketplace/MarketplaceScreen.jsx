import React, { useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { selectUser, selectSelectedRole } from '../../../../store/authSelectors';
import { SafeScreen } from '../../../../components/SafeScreen';
import AppHeader from '../../../../components/AppHeader';
import COLORS from '../../../../constant/colors';
import { w, h, f, mw } from '../../../../utils/responsive';
import { showAlert } from '../../../../components/CustomAlertBox';
import { getSellCommodities, deleteSellCommodity } from '../../../../service/sell/sellCommodity';
import { getReceivedOffers } from '../../../../service/buy/buyCommodityService';
import { getFriendlyErrorMessage } from '../../../../utils/errorUtils';

const ROLE_THEMES = {
  FPO:       { primary: COLORS.fpoPrimary,       secondary: COLORS.fpoSecondary,       light: COLORS.fpoLight,       text: COLORS.fpoText },
  Trader:    { primary: COLORS.traderPrimary,    secondary: COLORS.traderSecondary,    light: COLORS.traderLight,    text: COLORS.traderText },
  Miller:    { primary: COLORS.millerPrimary,    secondary: COLORS.millerSecondary,    light: COLORS.millerLight,    text: COLORS.millerText },
  Corporate: { primary: COLORS.corporatePrimary, secondary: COLORS.corporateSecondary, light: COLORS.corporateLight, text: COLORS.corporateText },
};

const PAGE_SIZE = 10;

// ─── Error classifier ─────────────────────────────────────────────────────────
// Centralizes all error-to-message logic using generic utility formatting
function classifyError(err) {
  if (!err) return 'Something went wrong. Please try again.';
  
  if (err?.response?.status === 401) return 'Session expired. Please log in again.';
  if (err?.response?.status === 403) return 'You do not have permission to view listings.';
  
  return getFriendlyErrorMessage(err);
}

// ─── Safe: extract moisture from qualityParameters array ─────────────────
function getMoistureFromParams(params) {
  if (!Array.isArray(params) || params.length === 0) return null;
  try {
    const found = params.find(p =>
      typeof p?.parameterName === 'string' &&
      p.parameterName.toLowerCase().includes('moisture'),
    );
    return found?.parameterValue ?? null;
  } catch {
    return null;
  }
}

// ─── Safe status label ────────────────────────────────────
function safeStatusLabel(status) {
  if (!status) return 'CLOSED';
  if (status === 'sold') return 'SOLD';
  return String(status).toUpperCase();
}

// ─── Safe price display ──────────────────────────────────
function safePriceDisplay(price) {
  if (price == null) return null;
  const n = Number(price);
  if (isNaN(n) || n <= 0) return null;
  try {
    return n.toLocaleString('en-IN');
  } catch {
    return String(n);
  }
}

// ─── Safe ISO date split ─────────────────────────────────
function safeDateDisplay(date) {
  if (!date) return null;
  try {
    return String(date).split('T')[0] || null;
  } catch {
    return null;
  }
}

// ─── Map raw API commodity → UI card + CommodityDetailsScreen item shape ──────
function mapApiItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  try {
    const seller = (raw.seller && typeof raw.seller === 'object')
      ? raw.seller
      : (raw.sellerId && typeof raw.sellerId === 'object')
        ? raw.sellerId
        : {};

    const sellerName =
      (seller.firstName && seller.lastName)
        ? `${seller.firstName} ${seller.lastName}`.trim()
        : seller.firstName?.trim() || seller.name?.trim() || 'Unknown Seller';

    const sellerRole = seller.role && ROLE_THEMES[seller.role] ? seller.role : 'Trader';
    const shopName = seller.shopName || seller.shopname || raw.shopName || raw.shopname || '';

    const moisture = getMoistureFromParams(raw.qualityParameters);

    const qualityParams = Array.isArray(raw.qualityParameters)
      ? raw.qualityParameters
          .filter(p => p?.parameterName || p?.name)
          .map(p => ({
            name: String(p?.parameterName || p?.name || '').trim(),
            val:  String(p?.parameterValue || p?.val || '').trim(),
          }))
      : [];

    const id = raw._id || raw.id;
    if (!id) return null;

    let sellerIdRaw = seller._id || seller.id;
    if (!sellerIdRaw && typeof raw.sellerId === 'string') sellerIdRaw = raw.sellerId;
    if (!sellerIdRaw && typeof raw.seller === 'string') sellerIdRaw = raw.seller;
    const sellerId = sellerIdRaw ? String(sellerIdRaw) : null;

    const rawTradeType = raw.tradeType || raw.deliveryType || null;
    const normalizedTradeType = rawTradeType === 'EX_WAREHOUSE' ? 'EX-Warehouse' : rawTradeType;
    const safeTradeType = ['FOR', 'EX-Warehouse'].includes(normalizedTradeType) ? normalizedTradeType : null;

    return {
      id:             String(id),
      sellerId:       sellerId ? String(sellerId) : null,
      crop:           String(raw.commodityName || '').trim() || '—',
      variety:        String(raw.type          || '').trim() || null,
      quantity:       `${raw.quantity ?? '?'} ${raw.unit || ''}`.trim(),
      price:          raw.sellingPrice != null ? String(raw.sellingPrice) : null,
      priceUnit:      String(raw.sellingPriceUnit || 'Qt'),
      location:       String(raw.commodityLocation || '').trim() || '—',
      moisture:       moisture ? String(moisture) : '—',
      deliveryType:   safeTradeType,
      isNegotiable:   raw.isNegotiable !== false,
      status:         String(raw.status || 'active'),
      publisherName:  sellerName,
      publisherRole:  sellerRole,
      listingEndDate: raw.listingEndDate || null,
      shopName:       String(shopName || ''),

      _fullItem: {
        id:                    String(id),
        commodityName:         String(raw.commodityName  || '—'),
        type:                  String(raw.type           || '—'),
        quantity:              String(raw.quantity       ?? ''),
        unit:                  String(raw.unit           || ''),
        sellingPrice:          raw.sellingPrice          ?? 0,
        sellingPriceUnit:      String(raw.sellingPriceUnit || 'Qt'),
        weightType:            String(raw.weightType     || 'Net Weight'),
        listingEndDate:        safeDateDisplay(raw.listingEndDate) || '—',
        weightTolerance:       String(raw.weightTolerance || '—'),
        billingAddress:        String(raw.billingAddress  || '—'),
        exWarehouseAddress:    raw.exWarehouseAddress || null,
        paymentTimeline:       String(raw.paymentTimeline || '—'),
        remarks:               String(raw.remarks         || ''),
        deliveryType:          safeTradeType,
        isNegotiable:          raw.isNegotiable !== false,
        minimumAcceptablePrice: raw.minimumAcceptablePrice ?? null,
        maxNegotiationRounds:  raw.maxNegotiationRounds  ?? 5,
        offerExpiryHours:      raw.offerExpiryHours      ?? 24,
        commodityLocation:     String(raw.commodityLocation || '—'),
        escrowEnabled:         raw.escrowEnabled         ?? false,
        buyerTransportAllowed: raw.buyerTransportAllowed ?? false,
        grade:                 raw.grade                 || null,
        moisture:              moisture ? String(moisture) : '—',
        qualityParameters:     qualityParams,
        sellerName,
        shopName:              String(shopName || ''),
        sellerRating:          typeof seller.rating           === 'number' ? seller.rating           : null,
        sellerCompletedTrades: typeof seller.completedTrades  === 'number' ? seller.completedTrades  : null,
        isSellerVerified:      seller.isVerified              ?? false,
        commodityImages:       Array.isArray(raw.commodityImages) ? raw.commodityImages : [],
        qualityReport:         Array.isArray(raw.qualityReport) ? raw.qualityReport : [],
      },
    };
  } catch (e) {
    if (__DEV__) console.warn('[mapApiItem] unexpected error:', e);
    return null;
  }
}

// ─── Error Boundary ───────────────────────────────────────────────────────────────
class MarketplaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown render error' };
  }

  componentDidCatch(error, info) {
    if (__DEV__) {
      console.error('[Marketplace ErrorBoundary]', error, info?.componentStack);
    } else {
      console.error('[Production Marketplace ErrorBoundary]', error, info);
    }
  }

  handleReset() {
    this.setState({ hasError: false, errorMessage: '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={boundaryStyles.container}>
          <Icon name="alert-circle-outline" size={56} color={COLORS.textMuted} />
          <Text style={boundaryStyles.title}>Something Went Wrong</Text>
          <Text style={boundaryStyles.msg}>{this.state.errorMessage}</Text>
          <TouchableOpacity style={boundaryStyles.btn} onPress={this.handleReset}>
            <Icon name="refresh" size={16} color={COLORS.white} />
            <Text style={boundaryStyles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const boundaryStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: w(24), backgroundColor: COLORS.white },
  title:     { fontSize: f(16), fontWeight: '800', color: COLORS.text, marginTop: h(12) },
  msg:       { fontSize: f(12), color: COLORS.textMuted, marginTop: h(6), textAlign: 'center', lineHeight: h(19) },
  btn:       { flexDirection: 'row', alignItems: 'center', gap: w(6), paddingHorizontal: w(22), paddingVertical: h(10), borderRadius: mw(10), marginTop: h(20), backgroundColor: COLORS.fpoPrimary },
  btnText:   { color: COLORS.white, fontWeight: '700', fontSize: f(13) },
});

// ─── Reducer ───────────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  listings:      [],
  loading:       true,
  refreshing:    false,
  loadingMore:   false,
  searching:     false,   // true only during a search/filter re-fetch (not initial load)
  error:         null,
  hasMore:       true,
  isInitialLoad: true,    // true until the very first successful fetch completes
  searchText:    '',
  selectedCrop:  'All',
  dynamicCrops:  ['All'],
};

function marketplaceReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START_FRESH':
      // Only used for the very first load — shows full skeleton
      return { ...state, loading: true, searching: false, error: null };
    case 'FETCH_START_SEARCH':
      // Used for search/filter re-fetches — keeps existing listings visible, shows subtle spinner
      return { ...state, searching: true, refreshing: false, error: null };
    case 'FETCH_START_REFRESH':
      return { ...state, refreshing: true, searching: false, error: null };
    case 'FETCH_START_MORE':
      return { ...state, loadingMore: true };

    case 'FETCH_SUCCESS_REPLACE':
      return {
        ...state,
        listings:      action.items,
        dynamicCrops:  action.crops,
        hasMore:       action.hasMore,
        loading:       false,
        refreshing:    false,
        searching:     false,
        isInitialLoad: false,   // after first successful fetch, never show full skeleton again
        error:         null,
      };
    case 'FETCH_SUCCESS_APPEND':
      return {
        ...state,
        listings:    [...state.listings, ...action.items],
        hasMore:     action.hasMore,
        loadingMore: false,
      };

    case 'FETCH_ERROR':
      return { ...state, loading: false, refreshing: false, searching: false, loadingMore: false, error: action.error };

    case 'SET_SEARCH':
      return {
        ...state,
        searchText:   action.text,
        selectedCrop: action.resetCrop ? 'All' : state.selectedCrop,
      };
    case 'SET_CROP':
      return {
        ...state,
        selectedCrop: action.crop,
        searchText:   action.clearSearch ? '' : state.searchText,
      };

    case 'RESET_HAS_MORE':
      return { ...state, hasMore: true };

    case 'UPDATE_ITEM': {
      const updated = state.listings.map(item =>
        item.id === action.item.id ? action.item : item,
      );
      return { ...state, listings: updated };
    }
    case 'REMOVE_ITEM':
      return { ...state, listings: state.listings.filter(item => item.id !== action.id) };

    default:
      return state;
  }
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonBoxLabel} />
        <View style={styles.skeletonBoxBadge} />
      </View>
      <View style={styles.skeletonBoxTitle} />
      <View style={styles.skeletonBoxSubtitle} />
      <View style={styles.skeletonBoxCTA} />
    </View>
  );
}

// ─── Offer Card ───────────────────────────────────────────────────────────────
function offerCardPropsAreEqual(prev, next) {
  if (prev.isOwner !== next.isOwner) return false;
  if (prev.theme?.primary !== next.theme?.primary) return false;
  const po = prev.offer;
  const no = next.offer;
  if (!po || !no) return po === no;
  return (
    po.id            === no.id            &&
    po.crop          === no.crop          &&
    po.variety       === no.variety       &&
    po.quantity      === no.quantity      &&
    po.price         === no.price         &&
    po.priceUnit     === no.priceUnit     &&
    po.location      === no.location      &&
    po.moisture      === no.moisture      &&
    po.isNegotiable  === no.isNegotiable  &&
    po.deliveryType  === no.deliveryType  &&
    po.status        === no.status        &&
    po.publisherName === no.publisherName &&
    po.publisherRole === no.publisherRole &&
    po.shopName      === no.shopName
  );
}

const OfferCard = React.memo(function OfferCard({ offer, theme, onPress, onEditPress, onDeletePress, isOwner }) {
  if (!offer || !theme) return null;

  const roleTheme = ROLE_THEMES[offer.publisherRole] || theme;
  const isExpired =
    offer.status === 'expired' ||
    offer.status === 'sold'    ||
    offer.status === 'cancelled';

  const priceDisplay = safePriceDisplay(offer.price);
  
  const accessibilityLabel = `Listing for ${offer.crop}${offer.variety ? ` variety ${offer.variety}` : ''}, quantity ${offer.quantity}, price ${priceDisplay ? `₹${priceDisplay} per ${offer.priceUnit}` : 'Negotiable'}, located in ${offer.location}. Published by ${offer.publisherName}${offer.shopName ? ` of ${offer.shopName}` : ''}. Status: ${offer.status}.`;

  return (
    <View
      style={[styles.offerCard, isExpired && styles.offerCardDimmed]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Publisher Row */}
      <View style={styles.publisherRow}>
        <View style={styles.publisherInfo}>
          <Icon name="account-circle-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.publisherName} numberOfLines={1}>
            {offer.publisherName || 'Unknown'}{offer.shopName ? ` (${offer.shopName})` : ''}
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleTheme.primary + '18' }]}>
          <Text style={[styles.roleBadgeText, { color: roleTheme.primary }]}>
            {offer.publisherRole || 'Seller'}
          </Text>
        </View>
      </View>

      {/* Crop + Location */}
      <View style={styles.offerHeader}>
        <View style={styles.cropInfoWrapper}>
          <Text style={styles.offerCrop} numberOfLines={1}>
            {offer.crop || '—'}
            {offer.variety ? ` (${offer.variety})` : ''}
          </Text>
          <View style={styles.locationRow}>
            <Icon name="map-marker-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.offerLocation}>{offer.location || '—'}</Text>
          </View>
        </View>

        {isExpired && (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredBadgeText}>
              {safeStatusLabel(offer.status)}
            </Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Quantity</Text>
          <Text style={styles.detailVal}>{offer.quantity || '—'}</Text>
        </View>

        <View style={[styles.detailCol, styles.detailColCenter]}>
          <Text style={styles.detailLabel}>Price / {offer.priceUnit || 'Qt'}</Text>
          <Text style={[styles.detailVal, { color: theme.primary }]}>
            {priceDisplay ? `₹${priceDisplay}` : 'N/A'}
          </Text>
        </View>

        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Moisture</Text>
          <Text style={styles.detailVal}>{offer.moisture || '—'}</Text>
        </View>
      </View>

      {/* Flags */}
      <View style={styles.flagsRow}>
        {offer.isNegotiable && (
          <View style={[styles.flag, { backgroundColor: theme.primary + '12' }]}>
            <Icon name="handshake-outline" size={11} color={theme.primary} />
            <Text style={[styles.flagText, { color: theme.primary }]}>Negotiable</Text>
          </View>
        )}

        {offer.deliveryType === 'FOR' && (
          <View style={styles.flagFOR}>
            <Icon name="truck-delivery-outline" size={11} color="#388E3C" />
            <Text style={styles.flagTextFOR}>FOR</Text>
          </View>
        )}

        {offer.deliveryType === 'EX-Warehouse' && (
          <View style={styles.flagWarehouse}>
            <Icon name="warehouse" size={11} color="#F57C00" />
            <Text style={styles.flagTextWarehouse}>Ex-Warehouse</Text>
          </View>
        )}
      </View>

      {/* Action Buttons Row */}
      {!isExpired && (
        <View style={styles.actionButtonsRow}>
          {isOwner && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => onDeletePress && offer.id && onDeletePress(offer)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Delete Listing"
                accessibilityHint={`Permanently deletes the listing for ${offer.crop}`}
              >
                <Icon name="trash-can-outline" size={16} color={COLORS.error} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn, { borderColor: theme.primary }]}
                onPress={() => onEditPress && onEditPress(offer)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Edit Listing"
                accessibilityHint={`Edits details of the listing for ${offer.crop}`}
              >
                <Icon name="pencil-outline" size={16} color={theme.primary} />
                <Text style={[styles.editBtnText, { color: theme.primary }]}>Edit</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.viewBtn, { backgroundColor: theme.primary }]}
            onPress={() => onPress && onPress(offer)}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="View Listing Details"
            accessibilityHint={`View detailed specifications and images of the listing for ${offer.crop}`}
          >
            <Icon name="eye-outline" size={16} color={COLORS.white} />
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}, offerCardPropsAreEqual);

// ─── Main Screen ──────────────────────────────────────────────────────────────
function MarketplaceScreenInner({ route, navigation }) {
  // PERFORMANCE FIX: Two granular selectors — MarketplaceScreenInner only
  // re-renders when user or selectedRole change. Combined with the React.memo
  // wrapper already on this component, this prevents cascading re-renders from
  // any unrelated auth action.
  const user      = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const bottomTabBarHeight = useBottomTabBarHeight();

  const [state, dispatch] = useReducer(marketplaceReducer, INITIAL_STATE);
  const {
    listings, loading, refreshing, loadingMore, searching,
    error, hasMore, searchText, selectedCrop, dynamicCrops, isInitialLoad,
  } = state;

  // Refs: isMounted guard, fetch lock, double-tap guard, page tracker, filter mirrors
  const isMountedRef      = useRef(true);
  const isFetchingRef     = useRef(false);
  const isDeletingRef     = useRef(false);
  const pageRef           = useRef(1);
  const searchTextRef     = useRef('');
  const selectedCropRef   = useRef('All');
  const hasListingsRef    = useRef(false);
  const isInitialLoadRef  = useRef(true);   // mirrors isInitialLoad state for use inside fetchListings closure
  const abortControllerRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const lastFetchTimeRef  = useRef(0);
  const searchTimeoutRef  = useRef(null);

  // Single mount/unmount effect — initialize and cleanup isMountedRef + abort any in-flight request
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Memoize currentUserId so it doesn't change reference every render
  const currentUserId = useMemo(() => {
    const raw = user?._id || user?.id;
    return raw ? String(raw).trim() : '';
  }, [user?._id, user?.id]);

  const fetchListings = useCallback(async ({
    pageNum = 1,
    isRefresh = false,
    isBackground = false,
    search = searchTextRef.current,
    crop = selectedCropRef.current,
  } = {}) => {
    // If loading a new page and already fetching, block it (no parallel page loads)
    if (pageNum > 1 && isFetchingRef.current) return;

    // For page 1 loads (new search, new crop, manual refresh), abort any active fetch
    if (pageNum === 1 && isFetchingRef.current) {
      abortControllerRef.current?.abort();
      isFetchingRef.current = false;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const thisGeneration = ++fetchGenerationRef.current;

    try {
      if (!isBackground) {
        if (!isMountedRef.current) return;
        if (isRefresh) {
          dispatch({ type: 'FETCH_START_REFRESH' });
        } else if (pageNum > 1) {
          dispatch({ type: 'FETCH_START_MORE' });
        } else if (isInitialLoadRef.current) {
          // Very first load ever → show full skeleton
          dispatch({ type: 'FETCH_START_FRESH' });
        } else {
          // Search / filter / crop change → stale-while-revalidate: keep current list, show subtle spinner
          dispatch({ type: 'FETCH_START_SEARCH' });
        }
      }

      const params = { status: 'active', page: pageNum, limit: PAGE_SIZE };
      const trimmedSearch = (typeof search === 'string' ? search : '').trim();
      const safeCrop = typeof crop === 'string' ? crop : 'All';
      if (trimmedSearch) {
        params.commodityName = trimmedSearch;
      } else if (safeCrop !== 'All') {
        params.commodityName = safeCrop;
      }

      const response = await getSellCommodities(params, { signal: controller.signal });

      if (thisGeneration !== fetchGenerationRef.current) return;
      if (!isMountedRef.current) return;

      const rawItems =
        response?.data?.commodities ||
        (Array.isArray(response?.data) ? response.data : null) ||
        response?.commodities ||
        response?.listings  ||
        response?.docs      ||
        response?.results   ||
        (Array.isArray(response) ? response : []);

      const items = Array.isArray(rawItems)
        ? rawItems.reduce((acc, raw) => {
            const mapped = mapApiItem(raw);
            if (mapped) acc.push(mapped);
            return acc;
          }, [])
        : [];

      if (__DEV__ && Array.isArray(rawItems) && items.length < rawItems.length) {
        console.warn(`[Marketplace] ⚠️ ${rawItems.length - items.length} item(s) skipped — malformed/missing _id`);
      }

      const totalDocs  = response?.data?.total || response?.total || response?.totalDocs || response?.count || items.length;
      const totalPages = response?.data?.totalPages || response?.totalPages || Math.ceil(totalDocs / PAGE_SIZE) || 1;
      const nextHasMore = pageNum < totalPages && items.length === PAGE_SIZE;

      if (pageNum === 1 || isRefresh) {
        const cropSet = new Set();
        for (const item of items) {
          if (item.crop && item.crop !== '\u2014') cropSet.add(item.crop);
        }
        dispatch({
          type:    'FETCH_SUCCESS_REPLACE',
          items,
          crops:   ['All', ...cropSet],
          hasMore: nextHasMore,
        });
      } else {
        dispatch({ type: 'FETCH_SUCCESS_APPEND', items, hasMore: nextHasMore });
      }

      pageRef.current = pageNum;
      lastFetchTimeRef.current = Date.now();
      if (pageNum === 1 || isRefresh) isInitialLoadRef.current = false;

    } catch (err) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;

      if (__DEV__) {
        console.error('[Marketplace] fetch error:', err);
      } else {
        console.error('[Production Marketplace] fetch error:', {
          message: err?.message || String(err),
          status: err?.response?.status,
          code: err?.code,
          url: err?.config?.url,
        });
      }
      if (!isMountedRef.current) return;

      const errMsg = classifyError(err);
      dispatch({ type: 'FETCH_ERROR', error: errMsg });

      if (pageNum > 1) {
        showAlert({ type: 'error', title: 'Load More Failed', message: errMsg });
      } else if (isRefresh) {
        showAlert({ type: 'error', title: 'Refresh Failed', message: errMsg });
      }
    } finally {
      if (thisGeneration === fetchGenerationRef.current) {
        isFetchingRef.current = false;
      }
    }
  }, []);

  useEffect(() => { searchTextRef.current = searchText; }, [searchText]);
  useEffect(() => { selectedCropRef.current = selectedCrop; }, [selectedCrop]);

  const rawUpdatedItem = route?.params?.rawUpdatedItem;

  useEffect(() => {
    if (rawUpdatedItem) {
      const mapped = mapApiItem(rawUpdatedItem);
      if (mapped) dispatch({ type: 'UPDATE_ITEM', item: mapped });
      navigation.setParams({ rawUpdatedItem: null });
    }
  }, [rawUpdatedItem, navigation]);

  useFocusEffect(
    useCallback(() => {
      let interactionHandle;
      const cacheExpiry = 60_000;
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;

      if (!hasListingsRef.current) {
        dispatch({ type: 'FETCH_START_FRESH' });
        interactionHandle = InteractionManager.runAfterInteractions(() => {
          fetchListings({ pageNum: 1, isRefresh: false });
        });
      } else if (timeSinceLastFetch > cacheExpiry) {
        interactionHandle = InteractionManager.runAfterInteractions(() => {
          fetchListings({ pageNum: 1, isBackground: true });
        });
      }

      const intervalTimer = setInterval(() => {
        fetchListings({ pageNum: 1, isBackground: true });
      }, 300_000);

      return () => {
        interactionHandle?.cancel();
        clearInterval(intervalTimer);
        abortControllerRef.current?.abort();
      };
    }, [fetchListings])
  );

  const handleRefresh = useCallback(() => {
    dispatch({ type: 'RESET_HAS_MORE' });
    fetchListings({ pageNum: 1, isRefresh: true });
  }, [fetchListings]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading && !refreshing) {
      fetchListings({ pageNum: pageRef.current + 1 });
    }
  }, [loadingMore, hasMore, loading, refreshing, fetchListings]);

  const handleCardPress = useCallback((offer) => {
    if (!offer) return;
    if (!offer._fullItem) {
      showAlert({ type: 'error', title: 'Error', message: 'Could not load listing details. Please try again.' });
      return;
    }
    if (!navigation) return;
    
    const safeSellerId = offer.sellerId ? String(offer.sellerId) : '';
    const isOwner = Boolean(currentUserId && safeSellerId && currentUserId === safeSellerId);
    
    const fullItem = { ...offer._fullItem, sellerId: offer.sellerId ?? null };
    if (!isOwner) {
      delete fullItem.minimumAcceptablePrice;
    }
    
    navigation.navigate('CommodityDetails', { item: fullItem });
  }, [navigation, currentUserId]);

  const handleEditPress = useCallback((offer) => {
    if (!offer?._fullItem || !navigation) return;
    navigation.navigate('Sell', { editItem: offer._fullItem });
  }, [navigation]);

  const handleDeletePress = useCallback(async (offer) => {
    if (!offer?.id) {
      showAlert({ type: 'error', title: 'Error', message: 'Cannot delete: listing ID is missing.' });
      return;
    }

    const cropLabel = offer.crop && offer.crop !== '\u2014' ? `"${offer.crop}"` : 'this';

    try {
      const res = await getReceivedOffers(offer.id);
      const allOffers = res?.data?.offers || res?.offers || [];
      const TERMINAL = ['accepted', 'rejected', 'expired', 'sold', 'cancelled'];
      const activeNegotiations = allOffers.filter(o => {
        const st = (o.status || '').toLowerCase().replace(/\s+/g, '_');
        return !TERMINAL.includes(st);
      });

      if (activeNegotiations.length > 0) {
        showAlert({
          type: 'warning',
          title: '⚠️ Cannot Delete Listing',
          message:
            `This listing cannot be deleted because it is currently involved in ${activeNegotiations.length} active negotiation deal${activeNegotiations.length > 1 ? 's' : ''} with buyer${activeNegotiations.length > 1 ? 's' : ''}.\n\nReason: Active buyer negotiations are in progress for this product. Deleting it would disrupt ongoing deals.\n\nPlease wait for all negotiations to conclude — either accepted, rejected, or expired — before removing this listing.`,
          buttons: [
            { text: 'Got It', style: 'cancel' },
          ],
        });
        return;
      }
    } catch (checkErr) {
      if (__DEV__) console.warn('[handleDeletePress] pre-check failed:', checkErr);
    }

    showAlert({
      type: 'confirm',
      title: 'Delete Listing',
      message: `Are you sure you want to permanently delete ${cropLabel} listing? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isDeletingRef.current) return;
            isDeletingRef.current = true;
            try {
              await deleteSellCommodity(offer.id);
              if (isMountedRef.current) {
                dispatch({ type: 'REMOVE_ITEM', id: offer.id });
              }
              showAlert({
                type: 'success',
                title: 'Deleted Successfully',
                message: 'The listing has been removed from the marketplace.',
              });
            } catch (err) {
              const friendlyMsg = getFriendlyErrorMessage(err?.message || err);
              showAlert({
                type: 'error',
                title: (err?.response?.status === 400 || err?.statusCode === 400) ? 'Cannot Delete' : 'Delete Failed',
                message: friendlyMsg,
              });
            } finally {
              isDeletingRef.current = false;
            }
          },
        },
      ],
    });
  }, []);

  const handleSearchChange = useCallback((text) => {
    const safeText = typeof text === 'string' ? text : '';
    const shouldResetCrop = safeText.trim().length > 0 && selectedCropRef.current !== 'All';
    
    dispatch({
      type: 'SET_SEARCH',
      text: safeText,
      resetCrop: shouldResetCrop,
    });

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const currentCrop = shouldResetCrop ? 'All' : selectedCropRef.current;
      pageRef.current = 1;
      dispatch({ type: 'RESET_HAS_MORE' });
      fetchListings({
        pageNum: 1,
        search: safeText,
        crop: currentCrop,
      });
    }, 500);
  }, [fetchListings]);

  const handleClearSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    dispatch({ type: 'SET_SEARCH', text: '', resetCrop: false });
    pageRef.current = 1;
    dispatch({ type: 'RESET_HAS_MORE' });
    fetchListings({
      pageNum: 1,
      search: '',
      crop: selectedCropRef.current,
    });
  }, [fetchListings]);

  const handleChipPress = useCallback((crop) => {
    if (!crop || typeof crop !== 'string') return;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const clearSearch = searchTextRef.current.trim().length > 0;
    
    dispatch({
      type: 'SET_CROP',
      crop,
      clearSearch,
    });

    const currentSearch = clearSearch ? '' : searchTextRef.current;
    pageRef.current = 1;
    dispatch({ type: 'RESET_HAS_MORE' });
    fetchListings({
      pageNum: 1,
      search: currentSearch,
      crop,
    });
  }, [fetchListings]);

  const keyExtractor = useCallback((item) => item?.id ?? '', []);

  const renderItem = useCallback(({ item }) => {
    if (!item?.id) return null;
    const safeSellerId = item.sellerId ? String(item.sellerId) : '';
    const isOwner = Boolean(currentUserId && safeSellerId && currentUserId === safeSellerId);
    return (
      <OfferCard
        offer={item}
        theme={theme}
        onPress={handleCardPress}
        onEditPress={handleEditPress}
        onDeletePress={handleDeletePress}
        isOwner={isOwner}
      />
    );
  }, [theme, currentUserId, handleCardPress, handleEditPress, handleDeletePress]);

  // Dynamic layout calculations & styles memoized before return to avoid inline recreations
  const flatListContentStyle = useMemo(() => [
    styles.listContent,
    { paddingBottom: bottomTabBarHeight + h(20) }
  ], [bottomTabBarHeight]);

  const safeScreenStyle = useMemo(() => ({
    backgroundColor: theme.light
  }), [theme.light]);

  const activeChipStyle = useMemo(() => ({
    backgroundColor: theme.primary
  }), [theme.primary]);

  const activeChipTextStyle = useMemo(() => ({
    color: COLORS.white
  }), []);

  const listHeader = useMemo(() => (
    <View style={{ height: h(8) }} />
  ), []);

  const listFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.loadMoreContainer} accessible={true} accessibilityLabel="Loading more listings">
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={styles.loadMoreText}>Loading more listings…</Text>
        </View>
      );
    }
    if (!hasMore && listings.length > 0) {
      return (
        <View style={styles.endOfListContainer} accessible={true} accessibilityLabel="You have seen all active listings">
          <Text style={styles.endOfListText}>— You've seen all active listings —</Text>
        </View>
      );
    }
    return <View style={styles.listBottomPadding} />;
  }, [loadingMore, hasMore, listings.length, theme.primary]);

  const listEmpty = useMemo(() => {
    if (loading) return null;
    const emptyText = searchText.trim()
      ? `No active sell offers found for "${searchText.trim()}".`
      : selectedCrop !== 'All'
      ? `No active ${selectedCrop} listings right now.`
      : 'No active sell listings at the moment.\nCheck back soon!';

    return (
      <View style={styles.emptyState} accessible={true}>
        <Icon name="store-alert-outline" size={56} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No Listings Found</Text>
        <Text style={styles.emptyText}>{emptyText}</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.retryBtn, { backgroundColor: theme.primary, marginTop: h(16) }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Refresh list"
          accessibilityHint="Refreshes the marketplace listings"
        >
          <Icon name="refresh" size={16} color={COLORS.white} />
          <Text style={styles.retryText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, searchText, selectedCrop, handleRefresh, theme.primary]);

  useEffect(() => {
    if (listings.length > 0) hasListingsRef.current = true;
  }, [listings.length]);

  const handleRetry = useCallback(() => {
    fetchListings({ pageNum: 1 });
  }, [fetchListings]);

  if (error && listings.length === 0) {
    return (
      <SafeScreen style={safeScreenStyle} top={false} bottom={false}>
        <AppHeader backgroundColor={theme.primary} title="Agri Marketplace" subtitle="Trade crops at best market prices" showBackButton={false} />
        <View style={styles.errorContainer} accessible={true}>
          <Icon
            name={typeof error === 'string' && error.includes('connection') ? 'wifi-off' : 'store-alert-outline'}
            size={56}
            color={COLORS.textMuted}
          />
          <Text style={styles.errorTitle}>Could Not Load Marketplace</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
            onPress={handleRetry}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Try loading again"
            accessibilityHint="Retries loading marketplace listings"
          >
            <Icon name="refresh" size={18} color={COLORS.white} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={safeScreenStyle} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title="Agri Marketplace"
        subtitle="Browse live sell listings from FPOs & Traders"
        showBackButton={false}
      />

      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
          keyboardShouldPersistTaps="handled"
        >
          {dynamicCrops.map(crop => {
            const isSelected = selectedCrop === crop;
            return (
              <TouchableOpacity
                key={crop}
                style={[styles.chip, isSelected && activeChipStyle]}
                onPress={() => handleChipPress(crop)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${crop} filter`}
                accessibilityState={{ selected: isSelected }}
                accessibilityHint={`Filter marketplace listings by ${crop}`}
              >
                <Text style={[styles.chipText, isSelected && activeChipTextStyle]}>
                  {crop}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sticky Search Bar (Sibling of FlatList) */}
      <View style={styles.searchBarContainer}>
        <Icon name="magnify" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search commodity (Wheat, Soybean…)"
          placeholderTextColor={COLORS.textMuted}
          value={searchText}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessible={true}
          accessibilityLabel="Search commodity"
          accessibilityHint="Enter a crop name to search active marketplace listings"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={handleClearSearch}
            style={styles.searchClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            accessibilityHint="Clears the search input and displays all items for the selected crop"
          >
            <Icon name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {!loading && !error && listings.length > 0 && (
        <Text style={styles.resultsCount} accessibilityLiveRegion="polite">
          {listings.length} active listing{listings.length !== 1 ? 's' : ''} found
          {selectedCrop !== 'All' ? ` for ${selectedCrop}` : ''}
          {searchText.trim() ? ` matching "${searchText.trim()}"` : ''}
        </Text>
      )}

      {/* Subtle searching spinner — shown during search/filter re-fetch, never wipes the list */}
      {searching && (
        <View style={styles.searchingIndicator} accessible={true} accessibilityLabel="Searching listings">
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.searchingText, { color: theme.primary }]}>Searching…</Text>
        </View>
      )}

      {/* Full skeleton only on very first load (isInitialLoad=true), never on search/filter */}
      {isInitialLoad && loading && listings.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.skeletonContainer}
          scrollEnabled={false}
        >
          {[1, 2, 3].map(k => <SkeletonCard key={k} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={keyExtractor}
          contentContainerStyle={flatListContentStyle}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={10}
          initialNumToRender={6}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={renderItem}
          ListEmptyComponent={listEmpty}
        />
      )}
    </SafeScreen>
  );
}

// ─── Public export wrapped in Error Boundary ────────────────────────────────────────────
// Wrapping here means any render-time JS exception in the screen tree
// shows a friendly recovery UI instead of crashing the whole app.
export default function MarketplaceScreen(props) {
  return (
    <MarketplaceErrorBoundary>
      <MarketplaceScreenInner {...props} />
    </MarketplaceErrorBoundary>
  );
}

const styles = StyleSheet.create({
  chipsWrapper: {
    backgroundColor: COLORS.white,
    paddingVertical: h(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  chipsContainer: {
    paddingHorizontal: w(16),
    gap: w(8),
  },
  chip: {
    paddingHorizontal: w(14),
    paddingVertical: h(6),
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
  },
  chipText: {
    fontSize: f(12),
    fontWeight: '600',
    color: COLORS.textLight,
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: mw(12),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginHorizontal: w(16),
    marginTop: h(12),
    marginBottom: h(4),
    paddingHorizontal: w(10),
    height: h(44),
  },
  searchIcon: {
    marginRight: w(6),
  },
  searchInput: {
    flex: 1,
    fontSize: f(13),
    color: COLORS.text,
    height: '100%',
  },
  searchClear: {
    padding: w(4),
  },
  resultsCount: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginHorizontal: w(16),
    marginBottom: h(6),
    marginTop: h(4),
  },

  listContent: {
    paddingHorizontal: w(16),
    paddingBottom: h(80),
  },
  listBottomPadding: {
    height: h(20),
  },

  offerCard: {
    backgroundColor: COLORS.white,
    borderRadius: mw(16),
    padding: w(14),
    marginBottom: h(12),
    marginTop: h(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  offerCardDimmed: {
    opacity: 0.55,
  },
  publisherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    paddingBottom: h(6),
  },
  publisherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    flex: 1,
  },
  publisherName: {
    fontSize: f(11),
    fontWeight: '700',
    color: COLORS.textMuted,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: w(7),
    paddingVertical: h(2),
    borderRadius: 6,
    marginLeft: w(6),
  },
  roleBadgeText: {
    fontSize: f(9),
    fontWeight: '800',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: h(10),
  },
  cropInfoWrapper: {
    flex: 1,
    marginTop: h(2),
  },
  offerCrop: {
    fontSize: f(15),
    fontWeight: '800',
    color: COLORS.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(3),
    marginTop: h(3),
  },
  offerLocation: {
    fontSize: f(11),
    color: COLORS.textMuted,
  },
  expiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: w(8),
    paddingVertical: h(3),
    borderRadius: 6,
    marginLeft: w(8),
  },
  expiredBadgeText: {
    color: '#DC2626',
    fontSize: f(9),
    fontWeight: '800',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: mw(10),
    padding: w(12),
    marginBottom: h(10),
  },
  detailCol: {
    alignItems: 'flex-start',
    flex: 1,
  },
  detailColCenter: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginBottom: h(2),
  },
  detailVal: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  flagsRow: {
    flexDirection: 'row',
    gap: w(6),
    flexWrap: 'wrap',
    marginBottom: h(10),
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(3),
    paddingHorizontal: w(7),
    paddingVertical: h(3),
    borderRadius: 6,
  },
  flagFOR: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(3),
    paddingHorizontal: w(7),
    paddingVertical: h(3),
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
  },
  flagWarehouse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(3),
    paddingHorizontal: w(7),
    paddingVertical: h(3),
    borderRadius: 6,
    backgroundColor: '#FFF3E0',
  },
  flagDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(3),
    paddingHorizontal: w(7),
    paddingVertical: h(3),
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  flagText: {
    fontSize: f(10),
    fontWeight: '700',
  },
  flagTextFOR: {
    fontSize: f(10),
    fontWeight: '700',
    color: '#388E3C',
  },
  flagTextWarehouse: {
    fontSize: f(10),
    fontWeight: '700',
    color: '#F57C00',
  },
  flagTextDate: {
    fontSize: f(10),
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    gap: w(8),
    alignItems: 'center',
    marginTop: h(10),
  },
  actionBtn: {
    height: h(38),
    borderRadius: mw(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: w(4),
  },
  deleteBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    backgroundColor: COLORS.white,
  },
  deleteBtnText: {
    color: COLORS.error,
    fontWeight: '700',
    fontSize: f(11),
  },
  editBtn: {
    flex: 1,
    borderWidth: 1.5,
    backgroundColor: COLORS.white,
  },
  editBtnText: {
    fontWeight: '700',
    fontSize: f(11),
  },
  viewBtn: {
    flex: 1.4,
  },
  viewBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(11),
  },

  // ── Skeleton ───────────────────────────────────────────────────────────────
  skeletonContainer: {
    paddingHorizontal: w(16),
    paddingTop: h(12),
  },
  skeletonCard: {
    backgroundColor: COLORS.white,
    borderRadius: mw(16),
    padding: w(16),
    marginBottom: h(12),
    elevation: 1,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(8),
  },
  skeletonBoxLabel: {
    backgroundColor: '#EAECEF',
    borderRadius: mw(4),
    width: '30%',
    height: h(10),
  },
  skeletonBoxBadge: {
    backgroundColor: '#EAECEF',
    borderRadius: mw(4),
    width: '20%',
    height: h(10),
  },
  skeletonBoxTitle: {
    backgroundColor: '#EAECEF',
    borderRadius: mw(4),
    width: '65%',
    height: h(14),
    marginTop: h(10),
  },
  skeletonBoxSubtitle: {
    backgroundColor: '#EAECEF',
    borderRadius: mw(4),
    width: '40%',
    height: h(10),
    marginTop: h(6),
  },
  skeletonBoxCTA: {
    backgroundColor: '#EAECEF',
    borderRadius: mw(8),
    width: '100%',
    height: h(38),
    marginTop: h(14),
  },

  // ── Empty / Error ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: h(60),
    paddingHorizontal: w(24),
  },
  emptyTitle: {
    fontSize: f(15),
    fontWeight: '800',
    color: COLORS.text,
    marginTop: h(12),
  },
  emptyText: {
    fontSize: f(12),
    color: COLORS.textMuted,
    marginTop: h(6),
    textAlign: 'center',
    lineHeight: h(19),
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: w(28),
  },
  errorTitle: {
    fontSize: f(15),
    fontWeight: '800',
    color: COLORS.text,
    marginTop: h(12),
  },
  errorMsg: {
    fontSize: f(12),
    color: COLORS.textMuted,
    marginTop: h(6),
    textAlign: 'center',
    lineHeight: h(19),
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
    paddingHorizontal: w(22),
    paddingVertical: h(10),
    borderRadius: mw(10),
    marginTop: h(20),
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(13),
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: w(8),
    paddingVertical: h(16),
  },
  loadMoreText: {
    fontSize: f(12),
    color: COLORS.textMuted,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: h(20),
  },
  endOfListText: {
    fontSize: f(11),
    color: COLORS.textMuted,
  },

  // ── Search in-progress indicator (subtle, non-intrusive) ───────────────────
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: w(6),
    paddingVertical: h(6),
    marginHorizontal: w(16),
    marginBottom: h(4),
  },
  searchingText: {
    fontSize: f(11),
    fontWeight: '600',
  },
});
