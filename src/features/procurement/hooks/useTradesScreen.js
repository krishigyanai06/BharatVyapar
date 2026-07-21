import { useEffect, useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { getOffers, getReceivedOffers, getSellCommodities } from '../../marketplace/marketplace.api';
import { normalizeOfferList } from '../../marketplace/marketplace.normalizer';
import { getMySubmittedQuotes } from '../procurement.api';
import { getFriendlyErrorMessage } from '../../../shared/utils/errorUtils';
import { showAlert } from '../../../shared/components/CustomAlertBox';
import { ROLE_THEMES } from '../../../theme/roleThemes';
import {
  normalizeStatus,
  classifyBuyOffer,
  classifySellListing,
  BUY_SECTION_CONFIGS,
  SELL_SECTION_CONFIGS,
} from '../procurement.rules';

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

export function useTradesScreen({ navigation, route = {} }) {
  const user = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const [state, dispatch] = useReducer(tradesReducer, INITIAL_STATE);
  const {
    tradeMode, activeTab, selectedCrop, offers, sellListings,
    loading, refreshing, apiError, backendCrash, selectedOfferForModal,
  } = state;

  const [expandedSections, setExpandedSections] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const loadingRef = useRef(loading);

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

      const [offersListRaw, submittedQuotesRaw, sellList] = await Promise.all([
        getOffers({ page: 1, limit: 50 }, { signal: controller.signal }),
        getMySubmittedQuotes({ sellerId: user?.id || user?._id }, { signal: controller.signal }),
        getSellCommodities({ sellerId: user?.id || user?._id }, { signal: controller.signal }),
      ]);

      // getOffers (marketplace.api) already returns normalizeOfferList output (array of normalizeOffer objects).
      // getMySubmittedQuotes now returns raw response.data — extract array then normalize with
      // the same normalizer so both lists share an identical schema before merging.
      const mappedSubmittedQuotes = normalizeOfferList(submittedQuotesRaw);

      const combinedOffers = [...(offersListRaw || []), ...mappedSubmittedQuotes];
      const seen = new Set();
      const offersList = combinedOffers.filter(o => {
        const key = o?.id || o?._id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (thisGeneration !== fetchGenerationRef.current) return;
      if (!isMountedRef.current) return;

      const soldListings = sellList.filter(l => l.status === 'sold');
      let enrichedSellListings = sellList;

      if (soldListings.length > 0) {
        enrichedSellListings = await Promise.all(
          sellList.map(async (listing) => {
            if (listing.status !== 'sold') return listing;
            try {
              const offers = await getReceivedOffers(listing.id, { signal: controller.signal });
              if (thisGeneration !== fetchGenerationRef.current) return listing;
              const acceptedOffer = offers.find(o => o.status === 'accepted');
              return {
                ...listing,
                _dealId: acceptedOffer?.dealId || acceptedOffer?.id || null,
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
        console.error('[useTradesScreen] loadData error:', err);
      } else {
        console.error('[Production useTradesScreen] loadData error:', {
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
      const shouldRefresh = route?.params?.shouldRefresh;

      if (loadingRef.current || shouldRefresh || timeSinceLastFetch > cacheExpiry) {
        loadData();
        if (shouldRefresh) {
          navigation.setParams({ shouldRefresh: null });
        }
      }

      const intervalId = setInterval(() => {
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
    }, [loadData, route?.params?.shouldRefresh, navigation])
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
      return true;
    });
  }, [uniqueOffers, activeTab]);

  const statusFilteredSellListings = useMemo(() => {
    return sellListings.filter(listing => {
      const st = (listing.status || 'active').toLowerCase();
      if (activeTab === 'Active') return st === 'active';
      if (activeTab === 'In Negotiation') return st === 'active' && listing.isNegotiable !== false;
      if (activeTab === 'Accepted') return st === 'sold';
      if (activeTab === 'Closed') return ['expired', 'cancelled'].includes(st);
      return true;
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
  }, [filteredOffers, filteredSellListings, expandedSections, tradeMode, theme.primary, selectedRole]);

  const handleOfferPress = useCallback((offer) => {
    const resolvedDealId = offer.dealId || offer.id || offer._id || offer.deal?.id || offer.deal?._id;
    const resolvedCommodity = offer.commodity || 
                             (typeof offer.commodityId === 'object' ? offer.commodityId : null) || 
                             (typeof offer.requirementId === 'object' ? offer.requirementId : null) ||
                             {};
    const isSeller = user && offer.sellerId && String(offer.sellerId) === String(user._id || user.id);
    const resolvedRole = isSeller ? 'seller' : 'buyer';

    if (offer.status === 'accepted' && resolvedDealId) {
      navigation.navigate('DealDetails', {
        dealId: resolvedDealId,
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

  const handleRefresh = useCallback(() => loadData(true), [loadData]);

  const changeTradeMode = useCallback((mode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const changeTab = useCallback((tab) => {
    dispatch({ type: 'SET_TAB', tab });
  }, []);

  const changeCrop = useCallback((crop) => {
    dispatch({ type: 'SET_CROP', crop });
  }, []);

  const setModalOffer = useCallback((offer) => {
    dispatch({ type: 'SET_MODAL_OFFER', offer });
  }, []);

  return {
    user,
    selectedRole,
    theme,
    tradeMode,
    activeTab,
    selectedCrop,
    loading,
    refreshing,
    apiError,
    backendCrash,
    selectedOfferForModal,
    expandedSections,
    showTooltip,
    setShowTooltip,
    groupedListData,
    cropChips,
    uniqueOffers,
    filteredOffers,
    filteredSellListings,
    loadData,
    handleRefresh,
    handleOfferPress,
    toggleSection,
    changeTradeMode,
    changeTab,
    changeCrop,
    setModalOffer,
  };
}
