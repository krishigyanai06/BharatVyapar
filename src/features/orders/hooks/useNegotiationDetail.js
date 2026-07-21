// src/features/orders/hooks/useNegotiationDetail.js
// Data-fetch hook for NegotiationDetailsScreen.
// Owns: offer, item, loading, refreshing, apiError, cooldownSecs,
//       isMountedRef, loadOfferDetails, useFocusEffect background refresh,
//       cooldown countdown timer.
// Does NOT own: form state (counterPrice/Qty/Remarks), action state (submittingAction),
//               UI state (counterModalVisible, historyOpen).

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getOfferDetails,
  getSellCommodityById,
} from '../../marketplace/marketplace.api';
import { computeRemainingCooldown } from '../orders.rules';

/**
 * Manages offer data-fetching, item resolution, cooldown timer, and
 * background refresh for the negotiation detail screen.
 *
 * @param {object}   params
 * @param {string}   params.offerId            - Offer ID to fetch
 * @param {object}   [params.routeItem]        - Pre-seeded item from route params
 * @param {Function} [params.onOfferLoaded]    - Called after each successful load;
 *                                               receives offerData so screen can
 *                                               pre-fill its counter form fields.
 * @param {Function} params.t                  - Translation function (passed in to
 *                                               keep i18n context in screen layer)
 * @returns {{
 *   offer: object|null,
 *   item:  object|null,
 *   loading: boolean,
 *   refreshing: boolean,
 *   apiError: string|null,
 *   cooldownSecs: number,
 *   refresh: Function,
 *   handleRefresh: Function,
 * }}
 */
export function useNegotiationDetail({ offerId, routeItem, onOfferLoaded, t }) {
  const [offer, setOffer]           = useState(null);
  const [item, setItem]             = useState(routeItem || null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError]     = useState(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── Load Offer Detail ─────────────────────────────────────────────────────
  const loadOfferDetails = useCallback(async (isRefresh = false, isBackground = false) => {
    if (!offerId) {
      if (!isMountedRef.current) return;
      setApiError(t('No offer ID provided.'));
      if (!isBackground) setLoading(false);
      return;
    }

    try {
      if (!isBackground) {
        if (!isMountedRef.current) return;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
      }
      if (isMountedRef.current) setApiError(null);

      const res = await getOfferDetails(offerId);
      if (!isMountedRef.current) return;

      const offerData = res?.data?.offer || res?.offer || res?.data || res;
      setOffer(offerData);

      // Resolve embedded commodity/requirement and optionally fetch full listing details
      let resolvedCommodity =
        offerData?.commodity ||
        (typeof offerData?.commodityId === 'object' ? offerData.commodityId : null) ||
        (typeof offerData?.requirementId === 'object' ? offerData.requirementId : null);

      const commId =
        resolvedCommodity?.id || resolvedCommodity?._id ||
        offerData?.commodityId || offerData?.requirementId;

      if (commId && typeof commId === 'string' && !offerData?.requirementId) {
        try {
          const fullCommodity = await getSellCommodityById(commId);
          if (fullCommodity && isMountedRef.current) {
            resolvedCommodity = { ...resolvedCommodity, ...fullCommodity };
          }
        } catch (commErr) {
          console.warn('[useNegotiationDetail] Failed to fetch full commodity details:', commErr);
        }
      }

      if (resolvedCommodity && isMountedRef.current) {
        setItem(resolvedCommodity);
      }

      // Cooldown timer seed
      if (isMountedRef.current) {
        setCooldownSecs(computeRemainingCooldown(offerData?.cooldownEndsAt));
      }

      // Let screen pre-fill its counter form (screen owns those state values)
      if (typeof onOfferLoaded === 'function' && isMountedRef.current) {
        onOfferLoaded(offerData);
      }
    } catch (err) {
      console.warn('[useNegotiationDetail] loadOfferDetails error:', err);
      if (!isBackground && isMountedRef.current) {
        setApiError(err?.message || t('Failed to load negotiation details.'));
      }
    } finally {
      if (!isBackground && isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [offerId, onOfferLoaded, t]);

  const handleRefresh = useCallback(() => loadOfferDetails(true), [loadOfferDetails]);

  // ─── Background Refresh (5-min) ────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadOfferDetails();

      const intervalId = setInterval(() => {
        if (isMountedRef.current) {
          loadOfferDetails(false, true);
        } else {
          clearInterval(intervalId);
        }
      }, 300000);

      return () => clearInterval(intervalId);
    }, [loadOfferDetails])
  );

  // ─── Cooldown Countdown Tick ───────────────────────────────────────────────
  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const id = setInterval(() => {
      if (!isMountedRef.current) { clearInterval(id); return; }
      setCooldownSecs(prev => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownSecs > 0]);

  return {
    offer,
    item,
    loading,
    refreshing,
    apiError,
    cooldownSecs,
    refresh: loadOfferDetails,
    handleRefresh,
  };
}
