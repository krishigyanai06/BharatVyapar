import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import { w, h, f } from '../../../shared/utils/responsive';
import { showAlert } from '../../../shared/components/CustomAlertBox';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import {
  getOfferDetails,
  submitCounterOffer,
  acceptOffer,
  rejectOffer,
} from '../../marketplace/marketplace.api';

import { getSellCommodityById } from '../../marketplace/marketplace.api';


const ROLE_THEMES = {
  FPO: { primary: COLORS.fpoPrimary, secondary: COLORS.fpoSecondary, light: COLORS.fpoLight, text: COLORS.fpoText },
  Trader: { primary: COLORS.traderPrimary, secondary: COLORS.traderSecondary, light: COLORS.traderLight, text: COLORS.traderText },
  Miller: { primary: COLORS.millerPrimary, secondary: COLORS.millerSecondary, light: COLORS.millerLight, text: COLORS.millerText },
  Corporate: { primary: COLORS.corporatePrimary, secondary: COLORS.corporateSecondary, light: COLORS.corporateLight, text: COLORS.corporateText },
};

// ─── Animated Waiting Icon ───────────────────────────────────────────────────
function WaitingPulseIcon({ color, size = 20 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse: scale up then back
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    // Flip: 0→180° then pause then 180→360°, mimicking sand timer shake
    const flipAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 600, easing: Easing.back(1.5), useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(rotate, { toValue: 2, duration: 600, easing: Easing.back(1.5), useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(rotate, { toValue: 2, duration: 0, useNativeDriver: true }), // reset without visible jump
        Animated.timing(rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    pulseAnim.start();
    flipAnim.start();
    return () => { pulseAnim.stop(); flipAnim.stop(); };
  }, [pulse, rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1, 2], outputRange: ['0deg', '180deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ scale: pulse }, { rotate: spin }] }}>
      <Icon name="timer-sand" size={size} color={color} />
    </Animated.View>
  );
}

// \u2500\u2500\u2500 Your Turn Pulse Indicator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function YourTurnPulse({ color }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.6, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1.0, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: color + '50',
          transform: [{ scale: anim }],
        }}
      />
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

// Format seconds into mm:ss
function formatCountdown(seconds) {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}


// Format expiry into Xh Ym
function formatExpiry(expiresAt) {
  if (!expiresAt) return '--';
  const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
  if (diff === 0) return 'Expired';
  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Status badge config — reflects real backend statuses
// in_negotiation / countered: active multi-buyer negotiation (each buyer negotiates independently)
const STATUS_CONFIG = {
  pending:        { label: 'Awaiting Response', color: '#718096', bg: '#EDF2F7' },
  countered:      { label: 'Counter Received',  color: '#3182CE', bg: '#EBF8FF' },
  accepted:       { label: 'Deal Closed',       color: '#38A169', bg: '#F0FFF4' },
  rejected:       { label: 'Rejected',          color: '#E53E3E', bg: '#FFF5F5' },
  expired:        { label: 'Expired',           color: '#718096', bg: '#EDF2F7' },
  in_negotiation: { label: 'In Negotiation',   color: '#6B46C1', bg: '#FAF5FF' },
};


export default function NegotiationDetailsScreen({ route, navigation }) {
  const { t } = useTranslation();
  // PERFORMANCE FIX: Two granular selectors — only re-renders when user or
  // selectedRole change, not on profileLoading or other unrelated auth fields.
  const user      = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;
  const insets = useSafeAreaInsets();

  // Route params — offerId or offer object, and item
  const routeOffer = route?.params?.offer;
  const offerId = routeOffer?.id || routeOffer?._id || routeOffer?.offer?.id || routeOffer?.offer?._id || route?.params?.offerId;
  const routeItem = route?.params?.item;

  // ─── State ────────────────────────────────────────────────────────────
  const [offer, setOffer] = useState(null);
  const [item, setItem] = useState(routeItem || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Action state
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQty, setCounterQty] = useState('');
  const [counterRemarks, setCounterRemarks] = useState('');
  const [isFinalOfferToggle, setIsFinalOfferToggle] = useState(false);
  const [counterPriceError, setCounterPriceError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);
  // Cooldown countdown (seconds remaining)
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const cooldownTimer = useRef(null);

  // ─── Derived from API ────────────────────────────────────────────────
  const userId = user?._id || user?.id;
  const buyerIdObj = offer?.buyerId || offer?.buyer_id || offer?.buyer;
  const buyerId = typeof buyerIdObj === 'object' ? (buyerIdObj?._id || buyerIdObj?.id) : buyerIdObj;
  
  const sellerIdObj = offer?.sellerId || offer?.seller_id || offer?.seller || offer?.commodityId?.sellerId || offer?.commodityId?.seller_id || offer?.commodity?.sellerId || offer?.commodity?.seller_id || item?.sellerId;
  const sellerId = typeof sellerIdObj === 'object' ? (sellerIdObj?._id || sellerIdObj?.id) : sellerIdObj;
  
  const rounds = offer?.negotiationHistory || offer?.rounds || [];
  
  const getComputedTurn = () => {
    if (offer?.currentTurn) return offer.currentTurn;
    if (offer?.current_turn) return offer.current_turn;
    
    if (rounds.length === 0) {
      return 'seller';
    }
    
    const lastRound = rounds[rounds.length - 1];
    const lastSenderRole = lastRound?.role || lastRound?.proposedBy || lastRound?.proposed_by;
    if (lastSenderRole === 'buyer') {
      return 'seller';
    }
    if (lastSenderRole === 'seller') {
      return 'buyer';
    }
    
    const lastSenderId = lastRound?.offeredBy || lastRound?.proposerId || lastRound?.proposer_id;
    if (lastSenderId && buyerId && String(lastSenderId) === String(buyerId)) {
      return 'seller';
    }
    if (lastSenderId && sellerId && String(lastSenderId) === String(sellerId)) {
      return 'buyer';
    }
    
    return 'seller';
  };

  const currentTurn = getComputedTurn();

  const routeRole = route?.params?.role;
  const myRole = (userId && sellerId && String(userId) === String(sellerId)) ? 'seller' :
    (userId && buyerId && String(userId) === String(buyerId)) ? 'buyer' :
    (routeRole || 'buyer');

  // Construct timeline rounds ensuring the initial offer round is present
  const displayRounds = React.useMemo(() => {
    const roundsList = [];
    if (!offer) return roundsList;

    const offerRounds = offer.negotiationHistory || offer.rounds || [];
    const firstRound = offerRounds[0];
    const isFirstRoundBuyer = firstRound && (
      firstRound.role === 'buyer' ||
      firstRound.proposedBy === 'buyer' ||
      firstRound.proposed_by === 'buyer' ||
      (firstRound.offeredBy && buyerId && String(firstRound.offeredBy) === String(buyerId))
    );
    const hasInitialRound = Boolean(isFirstRoundBuyer);
    if (!hasInitialRound) {
      roundsList.push({
        roundNumber: 1,
        proposedBy: 'buyer',
        price: offer.price,
        quantity: offer.quantity,
        remarks: offer.remarks || 'Initial offer submitted',
        tradeType: offer.tradeType,
        createdAt: offer.createdAt,
      });
    }
    
    offerRounds.forEach((rd, index) => {
      const proposedBy = rd.proposedBy || rd.proposed_by || rd.role || (rd.offeredBy && buyerId && String(rd.offeredBy) === String(buyerId) ? 'buyer' : 'seller');
      const roundNumber = rd.roundNumber ?? rd.round_number ?? (index + 1);
      const isFinal = rd.isFinal ?? rd.is_final ?? rd.isFinalOffer;
      const createdAt = rd.createdAt ?? rd.created_at;
      
      if (roundNumber === 0 || (roundNumber === 1 && proposedBy === 'buyer')) {
        roundsList.push({
          ...rd,
          roundNumber: 1,
          proposedBy,
          isFinal,
          createdAt,
        });
      } else {
        const firstRoundNum = offerRounds[0]?.roundNumber ?? offerRounds[0]?.round_number;
        const displayNum = typeof roundNumber === 'number'
          ? (roundNumber === 0 ? 1 : (firstRoundNum === 0 ? roundNumber + 1 : roundNumber))
          : roundsList.length + 1;
        roundsList.push({
          ...rd,
          roundNumber: displayNum,
          proposedBy,
          isFinal,
          createdAt,
        });
      }
    });
    return roundsList;
  }, [offer, buyerId]);

  const isMyTurn = offer ? currentTurn === myRole : false;
  const lastRound = displayRounds[displayRounds.length - 1];
  const isLastRoundFinal = lastRound?.isFinal === true;
  const isFinalOfferFromServer = offer?.isFinalOffer === true || offer?.is_final_offer === true || isLastRoundFinal;
  const displayRoundCount = Math.max(1, (offer?.roundCount ?? offer?.round_count ?? displayRounds.length));
  // maxNegotiationRounds: use listing value if available; backend enforces default of 5
  const maxRounds = offer?.maxNegotiationRounds || offer?.commodityId?.maxNegotiationRounds || offer?.commodity?.maxNegotiationRounds || item?.maxNegotiationRounds || 5;
  const roundsMaxed = displayRoundCount >= maxRounds;
  const isTerminal = ['accepted', 'rejected', 'expired', 'cancelled', 'closed'].includes(offer?.status);
  
  // Check if negotiation rounds are allowed
  const resolvedCommodity = offer?.commodity || (typeof offer?.commodityId === 'object' ? offer?.commodityId : null) || item;
  const isNegotiable = offer?.isNegotiable !== false &&
                       item?.isNegotiable !== false &&
                       resolvedCommodity?.isNegotiable !== false;

  const isLockedByOtherNegotiation = false; // Multi-buyer flow: no locking — each buyer negotiates independently
  const canShowCounter = isMyTurn && !isTerminal && !isFinalOfferFromServer && !roundsMaxed && offer?.canCounter !== false && isNegotiable;
  const cooldownActive = cooldownSecs > 0;

  const expiresAt = offer?.expiresAt || offer?.expires_at || (offer?.createdAt ? new Date(new Date(offer.createdAt).getTime() + 24 * 3600 * 1000).toISOString() : null);

  const listedPrice = Number(item?.basePrice || item?.sellingPrice || 0);
  const currentPrice = Number(lastRound?.price || offer?.price || 0);
  const hasPrices = listedPrice > 0 && currentPrice > 0;
  const priceGap = hasPrices ? Math.abs(listedPrice - currentPrice) : 0;
  const gapPercent = hasPrices ? (priceGap / listedPrice) * 100 : 0;

  // ─── Load Offer Detail ────────────────────────────────────────────────
  const loadOfferDetails = useCallback(async (isRefresh = false, isBackground = false) => {
    if (!offerId) {
      setApiError(t('No offer ID provided.'));
      if (!isBackground) setLoading(false);
      return;
    }



    try {
      if (!isBackground) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
      }
      setApiError(null);

      const res = await getOfferDetails(offerId);
      const offerData = res?.data?.offer || res?.offer || res?.data || res;
      setOffer(offerData);

      // Set item from embedded commodity and fetch full populated listing details (including sellerName, shopName and sellingPrice)
      let resolvedCommodity = offerData?.commodity || (typeof offerData?.commodityId === 'object' ? offerData.commodityId : null);
      const commId = resolvedCommodity?.id || resolvedCommodity?._id || offerData?.commodityId;
      if (commId && typeof commId === 'string') {
        try {
          const fullCommodity = await getSellCommodityById(commId);
          if (fullCommodity) {
            resolvedCommodity = { ...resolvedCommodity, ...fullCommodity };
          }
        } catch (commErr) {
          console.warn('[NegotiationDetailsScreen] Failed to fetch full commodity details:', commErr);
        }
      }

      if (resolvedCommodity) {
        setItem(resolvedCommodity);
      }

      // Pre-fill counter form with last round's price or root price
      // Backend sends negotiationHistory (not rounds) — support both for safety
      const history = offerData?.negotiationHistory || offerData?.rounds || [];
      if (history.length > 0) {
        const lastRound = history[history.length - 1];
        setCounterPrice(String(lastRound.price || ''));
        setCounterQty(String(lastRound.quantity || ''));
      } else {
        setCounterPrice(String(offerData?.price || ''));
        setCounterQty(String(offerData?.quantity || ''));
      }

      // Setup cooldown timer
      if (offerData?.cooldownEndsAt) {
        const remaining = Math.max(0, Math.floor((new Date(offerData.cooldownEndsAt) - Date.now()) / 1000));
        setCooldownSecs(remaining);
      } else {
        setCooldownSecs(0);
      }
    } catch (err) {
      console.warn('[NegotiationDetails] loadOfferDetails error:', err);
      if (!isBackground) {
        setApiError(err?.message || t('Failed to load negotiation details.'));
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [offerId, routeItem, user?._id]);

  const handleRefresh = useCallback(() => loadOfferDetails(true), [loadOfferDetails]);

  useFocusEffect(
    useCallback(() => {
      loadOfferDetails();
      
      const intervalId = setInterval(() => {
        loadOfferDetails(false, true);
      }, 300000); // 5 minutes background refresh

      return () => clearInterval(intervalId);
    }, [loadOfferDetails])
  );

  // Cooldown timer tick
  useEffect(() => {
    if (cooldownSecs > 0) {
      cooldownTimer.current = setInterval(() => {
        setCooldownSecs(prev => {
          if (prev <= 1) {
            clearInterval(cooldownTimer.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownTimer.current);
  }, [cooldownSecs]);

  // ─── Accept ──────────────────────────────────────────────────────────
  const handleAccept = () => {
    if (submittingAction) return;

    const lastRound = displayRounds[displayRounds.length - 1];
    const price = lastRound?.price || offer?.price;
    const qty = lastRound?.quantity || offer?.quantity;

    showAlert({
      type: 'confirm',
      title: t('Accept Offer'),
      message: t('Accept offer at ₹{price}/Qtl for {qty} Ton? This will create an Escrow Deal and close negotiation.')
        .replace('{price}', price)
        .replace('{qty}', qty),
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Accept & Close Deal'),
          onPress: async () => {
            try {
              setSubmittingAction(true);
              const res = await acceptOffer(offerId);
              const resolvedDealId = res?.dealId || res?.data?.deal?._id || res?.deal?._id || res?.data?.deal?.id || res?.deal?.id || res?.data?.dealId;
              showAlert({
                type: 'success',
                title: t('Deal Confirmed!'),
                message: t('Agreement signed. Escrow deal generated successfully. Other pending offers on this listing will be automatically expired by the system.'),
                buttons: [
                  {
                    text: t('View Deal'),
                    onPress: () => {
                      // Backend API not ready yet — navigate without dealId
                      // DealDetails will show 'Order Accepted' pending screen
                      navigation.navigate('DealDetails', {
                        item,
                        role: myRole,
                      });
                    },
                  },
                ],
              });
            } catch (err) {
              console.warn('[NegotiationDetails] acceptOffer error:', err);
              showAlert({
                type: 'error',
                title: t('Accept Failed'),
                message: err?.message || t('Could not accept offer. Please try again.'),
              });
            } finally {
              setSubmittingAction(false);
              loadOfferDetails(true);
            }
          },
        },
      ],
    });
  };

  // ─── Reject ──────────────────────────────────────────────────────────
  const handleReject = () => {
    if (submittingAction) return;
    showAlert({
      type: 'confirm',
      title: t('Reject Offer'),
      message: t('Are you sure you want to reject this offer? This will end the negotiation.'),
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Reject Offer'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmittingAction(true);
              await rejectOffer(offerId, { reason: 'Rejected by user' });
              showAlert({
                type: 'info',
                title: t('Offer Rejected'),
                message: t('The offer has been declined. Negotiation ended.'),
                buttons: [{ text: t('Back'), onPress: () => navigation.goBack() }],
              });
            } catch (err) {
              console.warn('[NegotiationDetails] rejectOffer error:', err);
              showAlert({
                type: 'error',
                title: t('Reject Failed'),
                message: err?.message || t('Could not decline offer. Please try again.'),
              });
            } finally {
              setSubmittingAction(false);
              loadOfferDetails(true);
            }
          },
        },
      ],
    });
  };

  // ─── Counter Submit ────────────────────────────────────────────────
  const handleCounterSubmit = async () => {
    setCounterPriceError('');
    if (!counterPrice || !counterQty) {
      showAlert({
        type: 'error',
        title: t('Validation Error'),
        message: t('Please fill in counter price and quantity.'),
      });
      return;
    }

    const newPrice = Number(counterPrice);
    const lastRound = displayRounds[displayRounds.length - 1];
    if (lastRound) {
      const delta = Math.abs(newPrice - lastRound.price) / lastRound.price;
      if (delta >= 0.05) {
        const minAllowed = +(lastRound.price * 0.951).toFixed(0);
        const maxAllowed = +(lastRound.price * 1.049).toFixed(0);
        setCounterPriceError(t('Price must be within 5%. Allowed: ₹{min} – ₹{max}').replace('{min}', minAllowed).replace('{max}', maxAllowed));
        return;
      }
    }

    try {
      setSubmittingAction(true);
      const counterData = {
        price: newPrice,
        quantity: Number(counterQty),
        remarks: counterRemarks || '',
        isFinalOffer: isFinalOfferToggle,
      };

      await submitCounterOffer(offerId, counterData);
      setCounterModalVisible(false);
      setCounterRemarks('');
      setIsFinalOfferToggle(false);
      setCounterPriceError('');

      showAlert({
        type: 'success',
        title: t('Counter Offer Sent'),
        message: t('Counter of ₹{price}/Qtl sent. Waiting for response.').replace('{price}', counterPrice),
      });

      // Reload to get updated state
      loadOfferDetails();
    } catch (err) {
      console.warn('[NegotiationDetails] submitCounterOffer error:', err);

      // Handle specific API errors
      const code = err?.backendError?.error?.code || err?.code;
      if (code === 'PRICE_JUMP_TOO_HIGH') {
        const meta = err?.backendError?.error;
        setCounterPriceError(meta?.message ? t(meta.message) : t('Price change cannot exceed 5% per round.'));
      } else if (code === 'COOLDOWN_ACTIVE') {
        const retryAfter = err?.backendError?.error?.retryAfter;
        const retryMsg = retryAfter ? t(' Try again after {time}.').replace('{time}', new Date(retryAfter).toLocaleTimeString()) : '';
        showAlert({ type: 'error', title: t('Cooldown Active'), message: t('Please wait 30 minutes before countering again.{retry}').replace('{retry}', retryMsg) });
      } else if (code === 'ROUND_LIMIT_REACHED') {
        showAlert({ type: 'error', title: t('Round Limit'), message: t('Maximum {rounds} negotiation rounds reached. You can only Accept or Reject.').replace('{rounds}', maxRounds) });
      } else {
        showAlert({ type: 'error', title: t('Counter Failed'), message: err?.message || t('Could not submit counter offer. Try again.') });
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const buyerObj = offer?.buyerId || offer?.buyer || routeOffer?.buyerId || routeOffer?.buyer || {};
  const buyerFirstName = buyerObj.firstName || '';
  const buyerLastName  = buyerObj.lastName || '';
  const buyerFullName  = (buyerFirstName || buyerLastName)
    ? `${buyerFirstName} ${buyerLastName}`.trim()
    : buyerObj.name || routeOffer?.buyerName || 'Buyer';
  const buyerShopName  = buyerObj.shopName || buyerObj.shopname || '';
  const rawBuyerName   = buyerShopName ? `${buyerFullName} (${buyerShopName})` : buyerFullName;
  const buyerName      = (rawBuyerName && rawBuyerName !== '—' && rawBuyerName !== 'Buyer') ? rawBuyerName : t('Buyer');

  const sellerObj = offer?.sellerId || offer?.seller || offer?.commodityId?.sellerId || offer?.commodity?.sellerId || routeOffer?.sellerId || routeOffer?.seller || {};
  const sellerFirstName = typeof sellerObj === 'object' ? (sellerObj.firstName || '') : '';
  const sellerLastName  = typeof sellerObj === 'object' ? (sellerObj.lastName || '') : '';
  const sellerFullName  = (sellerFirstName || sellerLastName)
    ? `${sellerFirstName} ${sellerLastName}`.trim()
    : (typeof sellerObj === 'object' ? sellerObj.name : '') || item?.sellerName || '—';
  const sellerShopName  = typeof sellerObj === 'object' ? (sellerObj.shopName || sellerObj.shopname || '') : '';
  const rawSellerName   = sellerShopName ? `${sellerFullName} (${sellerShopName})` : sellerFullName;
  const sellerName      = (rawSellerName && rawSellerName !== '—' && rawSellerName !== 'Unknown Seller') ? rawSellerName : t('Seller');
  const renderedTimeline = React.useMemo(() => {
    if (displayRounds.length === 0) {
      return (
        <View style={styles.emptyRoundsContainer}>
          <Icon name="chat-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.emptyRoundsText}>{t('Offer submitted. Waiting for first response.')}</Text>
        </View>
      );
    }
    return displayRounds.map((rd, index) => {
      const isMe = String(rd.proposedBy) === myRole;
      return (
        <View key={index} style={styles.timelineRow}>
          <View style={styles.timelineIndicators}>
            <View style={[styles.dot, { backgroundColor: isMe ? theme.primary : '#3182CE' }]} />
            {index < displayRounds.length - 1 && <View style={styles.line} />}
          </View>

          <View
            style={[
              styles.roundCard,
              {
                backgroundColor: isMe ? theme.light : COLORS.white,
                borderColor: isMe ? theme.primary + '70' : '#3182CE70',
                borderWidth: 1.5,
              },
              rd.isFinal && styles.finalRoundCard,
            ]}
          >
            <View style={styles.roundHeader}>
              <Text style={[styles.roundSender, { color: isMe ? theme.primary : '#3182CE' }]}>
                {isMe ? t('You') : (myRole === 'buyer' ? sellerName : buyerName)}
              </Text>
              <Text style={styles.roundDate}>
                {rd.createdAt ? new Date(rd.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </Text>
            </View>
            {isNegotiable && (
              <Text style={styles.roundTitle}>
                {t('Round')} {rd.roundNumber ?? index + 1}
                {rd.isFinal ? t(' (FINAL OFFER)') : ''}
              </Text>
            )}
            <View
              style={[
                styles.roundSpecs,
                {
                  backgroundColor: isMe ? COLORS.white : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: isMe ? theme.primary + '12' : '#3182CE15',
                },
              ]}
            >
              <View>
                <Text style={styles.specLabel}>{t('Price')}</Text>
                <Text style={[styles.specVal, { color: isMe ? theme.primary : '#3182CE' }]}>
                  ₹{rd.price}/Qt
                </Text>
              </View>
              <View>
                <Text style={styles.specLabel}>{t('Quantity')}</Text>
                <Text style={styles.specVal}>{rd.quantity} {item?.unit || 'Ton'}</Text>
              </View>
              <View>
                <Text style={styles.specLabel}>{t('Trade')}</Text>
                <Text style={styles.specVal}>{rd.tradeType || offer?.tradeType || 'FOR'}</Text>
              </View>
            </View>
            {rd.remarks ? (
              <View style={styles.remarksRow}>
                <Icon name="message-text-outline" size={13} color={COLORS.textLight} />
                <Text style={styles.roundRemarks}>"{rd.remarks}"</Text>
              </View>
            ) : null}
          </View>
        </View>
      );
    });
  }, [displayRounds, myRole, theme, sellerName, buyerName, isNegotiable, item?.unit, offer?.tradeType, t]);

  // ─── Loading & Error screens ─────────────────────────────────────────
  if (loading) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t("Negotiation Thread")}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{t("Loading negotiation details...")}</Text>
        </View>
      </SafeScreen>
    );
  }

  if (apiError && !offer) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t("Negotiation Thread")}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centeredContainer}>
          <Icon name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorTitle}>{t("Failed to Load")}</Text>
          <Text style={styles.errorDesc}>{t(apiError)}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={() => loadOfferDetails()}>
            <Text style={styles.retryBtnText}>{t("Retry API")}</Text>
          </TouchableOpacity>

        </View>
      </SafeScreen>
    );
  }

  const statusCfg = offer?.status === 'accepted'
    ? { label: 'Deal Closed', color: '#16a34a', bg: '#f0fdf4' }
    : offer?.status === 'rejected'
    ? { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' }
    : offer?.status === 'expired'
    ? { label: 'Expired', color: '#6b7280', bg: '#f9fafb' }
    : offer?.status === 'cancelled'
    ? { label: 'Cancelled', color: '#6b7280', bg: '#f9fafb' }
    : offer?.status === 'closed'
    ? { label: 'Closed', color: '#6b7280', bg: '#f9fafb' }
    // Backend sends 'In Negotiation' (capital, spaced) — normalise both casings
    : (offer?.displayStatus === 'In Negotiation' || offer?.displayStatus === 'in_negotiation')
    ? { label: 'In Negotiation', color: '#6B46C1', bg: '#FAF5FF' }
    : isMyTurn
    ? { label: 'Action Required', color: '#2563eb', bg: '#eff6ff' }
    : { label: 'Awaiting Response', color: '#9ca3af', bg: '#f9fafb' };
  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title={t("Negotiation")}
        subtitle={item?.commodityName ? t(item.commodityName) : t('Thread')}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />



      {/* API Error Banner */}
      {apiError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={15} color={COLORS.white} />
          <Text style={styles.errorBannerText}>{t(apiError)}</Text>
          <TouchableOpacity onPress={() => loadOfferDetails(true)} style={styles.retryBadge}>
            <Text style={styles.retryBadgeText}>{t("Retry")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >

        {/* Deal Summary Header */}
        <View style={styles.dealHeaderCard}>
          <View style={styles.dealHeaderTop}>
            <View style={styles.flex1}>
              <Text style={styles.commodityTitle}>
                {t(item?.name || item?.commodityName || 'Commodity')} {item?.grade ? `(${t('Grade')} ${item.grade})` : ''}
              </Text>
              <Text style={styles.commodityVariety}>{item?.type ? t(item.type) : (item?.description ? t(item.description) : '')}</Text>
              <View style={[styles.partyRow, { alignItems: 'flex-start', backgroundColor: theme.light + '50', borderWidth: 1, borderColor: theme.primary + '12' }]}>
                <Icon name="account-multiple-outline" size={14} color={COLORS.textMuted} style={{ marginTop: 2 }} />
                <View style={styles.partiesColumn}>
                  {myRole !== 'buyer' && (
                    <Text style={styles.partyText} numberOfLines={1}>
                      <Text style={{ fontWeight: '700' }}>{t('Buyer:')}</Text> {buyerName}
                    </Text>
                  )}
                  {myRole !== 'seller' && (
                    <Text style={styles.partyText} numberOfLines={1}>
                      <Text style={{ fontWeight: '700' }}>{t('Seller:')}</Text> {sellerName}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{t(statusCfg.label)}</Text>
            </View>
          </View>

          {/* Price Strip */}
          <View style={[styles.pricingStrip, { backgroundColor: theme.light, borderColor: theme.primary + '20', borderWidth: 1 }]}>
            <View style={styles.pricingItem}>
              <Text style={styles.pricingLabel}>
                {myRole === 'seller' ? t("Buyer's Offer") : t("Original Ask")}
              </Text>
              <Text style={[styles.pricingVal, myRole === 'seller' && { color: theme.primary }]}>
                ₹{myRole === 'seller' 
                  ? (lastRound?.price || offer?.price || '--') 
                  : (item?.basePrice || item?.sellingPrice || '--')}/Qt
              </Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingItem}>
              <Text style={styles.pricingLabel}>
                {myRole === 'seller' ? t("Your Listed Price") : t("Current Bid")}
              </Text>
              <Text style={[styles.pricingVal, myRole !== 'seller' && { color: theme.primary }]}>
                ₹{myRole === 'seller'
                  ? (item?.basePrice || item?.sellingPrice || '--')
                  : (lastRound?.price || offer?.price || '--')}/Qt
              </Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingItem}>
              <Text style={styles.pricingLabel}>{t('Quantity')}</Text>
              <Text style={styles.pricingVal}>{lastRound?.quantity || offer?.quantity || '--'} {item?.unit || 'Ton'}</Text>
            </View>
          </View>

          {/* Round & Expiry info */}
          <View style={styles.metaRow}>
            {isNegotiable ? (
              <View style={styles.metaChip}>
                <Icon name="refresh-circle" size={14} color={theme.primary} />
                <Text style={[styles.metaChipText, { color: theme.primary }]}>
                  {t('Round {current} of {total}').replace('{current}', displayRoundCount).replace('{total}', maxRounds)}
                </Text>
              </View>
            ) : (
              <View style={[styles.metaChip, { backgroundColor: '#F0FFF4', borderColor: '#C6F6D5' }]}>
                <Icon name="handshake" size={14} color="#38A169" />
                <Text style={[styles.metaChipText, { color: '#2F855A' }]}>
                  {t('Direct Deal (No Negotiation)')}
                </Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Icon name="timer-outline" size={14} color={displayRoundCount >= 4 ? COLORS.error : COLORS.textMuted} />
              <Text style={[styles.metaChipText, { color: displayRoundCount >= 4 ? COLORS.error : COLORS.textMuted }]}>
                {t('Expires: {time}').replace('{time}', t(formatExpiry(expiresAt)))}
              </Text>
            </View>
            {isFinalOfferFromServer && (
              <View style={[styles.metaChip, { backgroundColor: '#FFF5F5' }]}>
                <Icon name="flag-checkered" size={14} color={COLORS.error} />
                <Text style={[styles.metaChipText, { color: COLORS.error }]}>{t('Final Offer')}</Text>
              </View>
            )}
          </View>
        </View>


        {/* Logistics Routing Widget */}
        {(item?.location || offer?.location) && (
          <View style={[styles.logisticsCard, { borderColor: theme.primary + '15', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: w(6), marginBottom: h(6) }}>
              <Icon name="truck-delivery-outline" size={18} color={theme.primary} />
              <Text style={[styles.logisticsTitle, { color: theme.text }]}>{t('Estimated Logistics Route')}</Text>
            </View>
            <View style={styles.routeContainer}>
              <Text style={styles.routePoint} numberOfLines={1}>{t(offer?.location || 'Buyer Location')}</Text>
              <View style={styles.routeLineContainer}>
                <View style={[styles.routeLine, { backgroundColor: theme.primary + '30' }]} />
                <Icon name="chevron-right" size={14} color={theme.primary} />
              </View>
              <Text style={styles.routePoint} numberOfLines={1}>{t(item?.location || 'Seller Location')}</Text>
            </View>
            <Text style={styles.logisticsMetaText}>
              {t('Est. Distance: ~1,200 km | Transit Duration: 3 Days')}
            </Text>
          </View>
        )}

        {/* Bharat Escrow Trust Shield */}
        <View style={styles.trustShieldContainer}>
          <Icon name="shield-check" size={18} color="#38A169" />
          <Text style={styles.trustShieldText}>
            {t('Bharat Escrow Secure: Payment is locked in escrow and only released after quality verification at delivery.')}
          </Text>
        </View>

        {/* Terminal Status Banner */}
        {isTerminal && (
          <View style={[styles.terminalBanner, {
            backgroundColor: offer?.status === 'accepted' ? '#F0FFF4' : offer?.status === 'rejected' ? '#FFF5F5' : '#EDF2F7',
            borderColor: offer?.status === 'accepted' ? '#9AE6B4' : offer?.status === 'rejected' ? '#FEB2B2' : '#CBD5E0',
          }]}>
            <Icon
              name={offer?.status === 'accepted' ? 'check-decagram' : offer?.status === 'rejected' ? 'close-circle' : 'clock-alert'}
              size={22}
              color={offer?.status === 'accepted' ? COLORS.success : offer?.status === 'rejected' ? COLORS.error : COLORS.textMuted}
            />
            <View style={styles.flex1}>
              <Text style={[styles.terminalBannerTitle, {
                color: offer?.status === 'accepted' ? '#22543D' : offer?.status === 'rejected' ? '#742A2A' : '#4A5568',
              }]}>
                {offer?.status === 'accepted' ? t('Deal Accepted — Escrow Created') : offer?.status === 'rejected' ? t('Offer Rejected') : t('Offer Expired')}
              </Text>
              <Text style={styles.terminalBannerDesc}>
                {offer?.status === 'accepted'
                  ? t('Both parties agreed. Check Deal Details for escrow progress.')
                  : offer?.status === 'rejected'
                  ? t('This negotiation has ended. You may submit a new offer.')
                  : t('This offer expired after 24 hours with no agreement reached.')}
              </Text>
            </View>
          </View>
        )}

        {/* ══════ TURN STATUS CARD (MVP Core) ══════ */}
        {!isTerminal && (
          isMyTurn ? (
            /* ── YOUR TURN ── */
            <View style={[styles.turnCard, {
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 8,
            }]}>
              <View style={styles.turnCardLeft}>
                <YourTurnPulse color="#FFFFFF" />
                <View style={{ marginLeft: w(10) }}>
                  <Text style={styles.turnCardTitle}>
                    {roundsMaxed ? t('Final Decision Required') : t('Your Turn to Respond')}
                  </Text>
                  <Text style={styles.turnCardSub}>
                    {roundsMaxed
                      ? t('Max rounds reached — Accept or Decline')
                      : t('Make your counter offer or accept')}
                  </Text>
                </View>
              </View>
              <View style={styles.turnCardArrow}>
                <Icon name="chevron-right" size={22} color="#FFFFFF" />
              </View>
            </View>
          ) : (
            /* ── WAITING ── */
            <View style={[styles.turnCard, {
              backgroundColor: theme.light,
              borderColor: theme.primary + '30',
              borderWidth: 1.5,
            }]}>
              <View style={styles.turnCardLeft}>
                <WaitingPulseIcon color={theme.primary} size={22} />
                <View style={{ marginLeft: w(10) }}>
                  <Text style={[styles.turnCardTitle, { color: theme.primary }]}>
                    {t('Waiting for Response')}
                  </Text>
                  <Text style={[styles.turnCardSub, { color: theme.text }]}>
                    <Text style={{ fontWeight: '800' }}>
                      {currentTurn === 'buyer' ? buyerName : sellerName}
                    </Text>
                    {t(' is reviewing your offer')}
                  </Text>
                </View>
              </View>
            </View>
          )
        )}

        {/* Price Gap / Delta Indicator */}
        {hasPrices && priceGap > 0 && (
          <View style={[styles.deltaContainer, { borderColor: theme.primary + '20', borderWidth: 1 }]}>
            <View style={styles.deltaHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: w(4) }}>
                <Icon name="swap-horizontal-bold" size={15} color={theme.primary} />
                <Text style={[styles.deltaLabelText, { color: theme.text }]}>{t('Negotiation Price Gap')}</Text>
              </View>
              <Text style={[styles.deltaValText, { color: gapPercent > 5 ? COLORS.error : '#E5A93B' }]}>
                ₹{priceGap}/Qt ({gapPercent.toFixed(1)}%)
              </Text>
            </View>
            <View style={styles.deltaTrack}>
              <View style={[styles.deltaFill, { width: `${Math.min(100, Math.max(10, 100 - gapPercent * 10))}%`, backgroundColor: gapPercent > 5 ? COLORS.error : '#E5A93B' }]} />
            </View>
          </View>
        )}

        {/* Negotiation History — Collapsible Wrapper */}
        <View style={[styles.historyWrapper, { borderColor: theme.primary + '20', borderWidth: 1 }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setHistoryOpen(prev => !prev)}
            style={[styles.historyHeader, { backgroundColor: theme.light }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: w(8) }}>
              <Icon name="history" size={16} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.primary, marginBottom: 0 }]}>
                {isNegotiable ? t('Negotiation History') : t('Offer Details')}
              </Text>
              {displayRounds.length > 0 && (
                <View style={[styles.roundCountBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.roundCountText}>{displayRounds.length}</Text>
                </View>
              )}
            </View>
            <Icon
              name={historyOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.primary}
            />
          </TouchableOpacity>

          {historyOpen && (
            <View style={styles.timeline}>
              {renderedTimeline}
            </View>
          )}
        </View>

        <View style={{ height: h(120) + insets.bottom }} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.actionFooter, { paddingBottom: insets.bottom + h(14) }]}>
        {submittingAction ? (
          <View style={styles.pendingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.pendingText}>{t('Processing...')}</Text>
          </View>
        ) : isTerminal ? (
          // Terminal state — show view deal or go back
          offer?.status === 'accepted' ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.success, flex: 1 }]}
              onPress={() => navigation.navigate('DealDetails', { dealId: offer?.dealId || offer?.id || offer?._id, item, role: myRole })}
            >
              <Icon name="handshake" size={18} color={COLORS.white} />
              <Text style={styles.acceptBtnText}>{t('View Escrow Deal')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.primary, flex: 1 }]}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={18} color={COLORS.white} />
              <Text style={styles.acceptBtnText}>{t('Back to Offers')}</Text>
            </TouchableOpacity>
          )
        ) : (
          // Active state (Negotiation in progress)
          <View>

            <View style={styles.buttonRow}>
              {/* Decline: Visible when it is your turn and negotiation is active */}
              {isMyTurn && (
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={handleReject}>
                  <Icon name="close-circle-outline" size={18} color={COLORS.error} />
                  <Text style={styles.rejectBtnText}>{t('Decline')}</Text>
                </TouchableOpacity>
              )}

              {/* Accept: Visible when it's your turn and the last round was proposed by the other party */}
              {isMyTurn && lastRound && (
                lastRound.proposedBy !== myRole &&
                lastRound.proposed_by !== myRole &&
                lastRound.role !== myRole
              ) && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                  onPress={handleAccept}
                  disabled={submittingAction}
                >
                  <Icon name="check-decagram" size={18} color={COLORS.white} />
                  <Text style={styles.acceptBtnText}>{t('Accept')}</Text>
                </TouchableOpacity>
              )}

              {/* Counter button — visible only when it is your turn */}
              {canShowCounter && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.counterBtn,
                    cooldownActive && styles.disabledBtn,
                  ]}
                  onPress={() => !cooldownActive && setCounterModalVisible(true)}
                  disabled={cooldownActive}
                >
                  <Icon name="swap-horizontal" size={18} color={cooldownActive ? COLORS.textMuted : theme.primary} />
                  <Text style={[styles.counterBtnText, { color: cooldownActive ? COLORS.textMuted : theme.primary }]}>
                    {cooldownActive ? t('Counter ({time})').replace('{time}', formatCountdown(cooldownSecs)) : t('Counter')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Counter Offer Modal */}
      <Modal
        visible={counterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCounterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Submit Counter Offer')}</Text>
              <TouchableOpacity onPress={() => { setCounterModalVisible(false); setCounterPriceError(''); }}>
                <Icon name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {t('Max 5% price movement per round. {info}')
                .replace('{info}', displayRoundCount + 1 < maxRounds 
                  ? t('{remaining} round(s) remaining after this.').replace('{remaining}', maxRounds - displayRoundCount - 1)
                  : t('This is the final round.')
                )}
            </Text>

            <Text style={styles.inputLabel}>{t('Counter Price (₹/Qt)')}</Text>
            <TextInput
              style={[styles.modalInput, counterPriceError ? styles.inputError : null]}
              keyboardType="numeric"
              value={counterPrice}
              onChangeText={v => { setCounterPrice(v); setCounterPriceError(''); }}
              placeholder={lastRound?.price ? t('e.g. {price}').replace('{price}', lastRound.price) : t('e.g. price')}
            />
            {counterPriceError ? (
              <Text style={styles.inlineError}>{t(counterPriceError)}</Text>
            ) : (
              <Text style={styles.hint}>
                {t('Last price: ₹{lastPrice} — Allowed ±5%: ₹{min} – ₹{max}')
                  .replace('{lastPrice}', lastRound?.price || '--')
                  .replace('{min}', lastRound ? +(lastRound.price * 0.951).toFixed(0) : '--')
                  .replace('{max}', lastRound ? +(lastRound.price * 1.049).toFixed(0) : '--')
                }
              </Text>
            )}

            <Text style={styles.inputLabel}>
              {t('Quantity ({unit})').replace('{unit}', item?.unit ? t(item.unit) : 'Ton')}
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={counterQty}
              onChangeText={setCounterQty}
              placeholder={lastRound?.quantity ? t('e.g. {qty}').replace('{qty}', lastRound.quantity) : t('e.g. quantity')}
            />

            <Text style={styles.inputLabel}>{t('Remarks / Conditions')}</Text>
            <TextInput
              style={[styles.modalInput, { height: h(60), textAlignVertical: 'top' }]}
              multiline
              value={counterRemarks}
              onChangeText={setCounterRemarks}
              placeholder={t('Explain your counter terms...')}
            />

            <View style={styles.switchRow}>
              <View style={styles.flex1}>
                <Text style={styles.switchLabel}>{t('Mark as Final Offer')}</Text>
                <Text style={styles.switchDesc}>
                  {isFinalOfferToggle ? t('Other party can ONLY accept or reject — no more counters.') : t('Other party can counter further.')}
                </Text>
              </View>
              <Switch
                value={isFinalOfferToggle}
                onValueChange={setIsFinalOfferToggle}
                trackColor={{ false: '#767577', true: theme.primary + '80' }}
                thumbColor={isFinalOfferToggle ? theme.primary : '#f4f3f4'}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setCounterModalVisible(false); setCounterPriceError(''); }}
                disabled={submittingAction}
              >
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handleCounterSubmit}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitBtnText}>{t('Submit Counter')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: w(24),
    paddingVertical: h(10),
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
  scrollContent: {
    padding: w(16),
  },
  // Deal Header Card
  dealHeaderCard: {
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
    borderColor: '#E2E8F0',
  },
  dealHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: h(12),
  },
  commodityTitle: {
    fontSize: f(15),
    fontWeight: '800',
    color: COLORS.text,
  },
  commodityVariety: {
    fontSize: f(11),
    color: COLORS.textLight,
    marginTop: h(2),
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    marginTop: h(6),
    backgroundColor: '#F8FAFC',
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 6,
  },
  partyText: {
    fontSize: f(11),
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  pricingStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: w(12),
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: h(12),
  },
  pricingItem: {
    alignItems: 'center',
    flex: 1,
  },
  pricingLabel: {
    fontSize: f(10),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  pricingVal: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: h(2),
    textAlign: 'center',
  },
  pricingDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(8),
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    backgroundColor: '#F8F9FA',
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  metaChipText: {
    fontSize: f(11),
    fontWeight: '600',
  },
  // Status banners
  terminalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: w(10),
    padding: w(14),
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: h(14),
  },
  terminalBannerTitle: {
    fontSize: f(13),
    fontWeight: '800',
    marginBottom: h(2),
  },
  terminalBannerDesc: {
    fontSize: f(11),
    color: COLORS.textLight,
    lineHeight: h(15),
  },
  roundLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: w(12),
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: h(14),
  },
  roundLimitText: {
    fontSize: f(12),
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: w(12),
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: h(14),
  },
  waitingText: {
    fontSize: f(12),
    color: COLORS.textLight,
    flex: 1,
  },
  // Timeline
  sectionTitle: {
    fontSize: f(14),
    fontWeight: '800',
    marginBottom: h(14),
  },
  timeline: {
    paddingLeft: w(4),
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineIndicators: {
    alignItems: 'center',
    marginRight: w(12),
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: h(16),
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#DEE2E6',
    marginVertical: h(4),
  },
  roundCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: w(14),
    marginBottom: h(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  finalRoundCard: {
    borderTopWidth: 2,
    borderTopColor: COLORS.error,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(4),
  },
  roundSender: {
    fontSize: f(11),
    fontWeight: '700',
  },
  roundDate: {
    fontSize: f(10),
    color: COLORS.textMuted,
  },
  roundTitle: {
    fontSize: f(12),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: h(10),
  },
  roundSpecs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: w(8),
    marginBottom: h(8),
  },
  specLabel: {
    fontSize: f(9),
    color: COLORS.textMuted,
  },
  specVal: {
    fontSize: f(11),
    fontWeight: '700',
    marginTop: h(1),
    color: COLORS.text,
  },
  roundRemarks: {
    fontSize: f(11),
    fontStyle: 'italic',
    color: COLORS.textLight,
    lineHeight: h(15),
  },
  emptyRoundsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: w(24),
    gap: h(8),
  },
  emptyRoundsText: {
    fontSize: f(13),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  // Action Footer
  actionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingVertical: h(14),
    paddingHorizontal: w(16),
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: w(8),
  },
  actionBtn: {
    flex: 1,
    height: h(44),
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: w(4),
  },
  rejectBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.error,
    flex: 0.9,
  },
  rejectBtnText: {
    color: COLORS.error,
    fontWeight: '700',
    fontSize: f(13),
  },
  counterBtn: {
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
  },
  counterBtnText: {
    fontWeight: '700',
    fontSize: f(12),
  },
  disabledBtn: {
    opacity: 0.55,
    backgroundColor: '#F1F3F5',
  },
  acceptBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(13),
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: w(8),
    paddingVertical: h(4),
  },
  pendingText: {
    fontSize: f(11),
    color: COLORS.textLight,
    flex: 1,
    lineHeight: h(16),
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: w(20),
    paddingBottom: h(30),
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    paddingBottom: h(12),
    marginBottom: h(10),
  },
  modalTitle: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.text,
  },
  modalDesc: {
    fontSize: f(11),
    color: COLORS.textMuted,
    lineHeight: h(15),
    marginBottom: h(12),
  },
  inputLabel: {
    fontSize: f(11),
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: h(10),
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: w(10),
    height: h(40),
    fontSize: f(13),
    color: COLORS.text,
    backgroundColor: '#F8F9FA',
    marginTop: h(4),
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inlineError: {
    fontSize: f(11),
    color: COLORS.error,
    marginTop: h(2),
    fontWeight: '600',
  },
  hint: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: w(10),
    marginVertical: h(14),
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  switchLabel: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
  },
  switchDesc: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  modalActions: {
    flexDirection: 'row',
    gap: w(10),
  },
  modalBtn: {
    flex: 1,
    paddingVertical: h(12),
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    backgroundColor: COLORS.white,
  },
  cancelBtnText: {
    color: COLORS.textLight,
    fontWeight: '700',
    fontSize: f(13),
  },
  submitBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(13),
  },
  // Interned helpers — prevent new JSObject allocation every render
  flex1: {
    flex: 1,
  },
  partiesColumn: {
    flex: 1,
    gap: 4,
  },
  remarksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    marginTop: h(8),
  },

  // ─── Price Delta Styles ──────────────────────────────────────────
  deltaContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: w(12),
    marginBottom: h(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  deltaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(8),
  },
  deltaLabelText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  deltaValText: {
    fontSize: f(12),
    fontWeight: '800',
  },
  deltaTrack: {
    height: h(6),
    backgroundColor: '#EDF2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  deltaFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ─── Logistics Styles ────────────────────────────────────────────
  logisticsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: w(12),
    marginBottom: h(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  logisticsTitle: {
    fontSize: f(11),
    fontWeight: '800',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: h(8),
    paddingHorizontal: w(12),
    marginBottom: h(6),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  routePoint: {
    fontSize: f(11),
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: '42%',
  },
  routeLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: w(4),
  },
  routeLine: {
    height: 2,
    flex: 1,
  },
  logisticsMetaText: {
    fontSize: f(9.5),
    color: COLORS.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: h(2),
  },

  // ─── Trust Shield Banner Styles ──────────────────────────────────
  trustShieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    backgroundColor: '#F0FFF4',
    borderColor: '#C6F6D5',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: h(10),
    paddingHorizontal: w(12),
    marginBottom: h(12),
  },
  trustShieldText: {
    fontSize: f(10.5),
    color: '#22543D',
    fontWeight: '600',
    flex: 1,
    lineHeight: h(15),
  },

  // ─── Quality Specs Styles ────────────────────────────────────────
  qualitySpecsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: w(12),
    marginBottom: h(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  qualityTitle: {
    fontSize: f(11),
    fontWeight: '800',
    marginBottom: h(8),
  },
  qualityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: w(10),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  qualityItem: {
    flex: 1,
  },
  qualityLabel: {
    fontSize: f(9),
    color: COLORS.textMuted,
    marginBottom: h(2),
  },
  qualityValText: {
    fontSize: f(11),
    fontWeight: '700',
    color: COLORS.text,
  },
  qualityStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(3),
    backgroundColor: '#E8F5E9',
    paddingHorizontal: w(5),
    paddingVertical: h(1),
    borderRadius: 4,
  },
  qualityStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  qualityStatusText: {
    fontSize: f(8.5),
    fontWeight: '800',
    color: '#2E7D32',
  },

  // ─── Negotiation History Accordion Wrapper ──────────────────────
  historyWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: h(14),
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: w(14),
    paddingVertical: h(12),
  },
  roundCountBadge: {
    minWidth: w(20),
    height: w(20),
    borderRadius: w(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: w(5),
  },
  roundCountText: {
    fontSize: f(10),
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ─── Turn Status Card ────────────────────────────────────────────
  turnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: w(16),
    paddingVertical: h(14),
    marginBottom: h(14),
  },
  turnCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  turnCardTitle: {
    fontSize: f(14),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  turnCardSub: {
    fontSize: f(11),
    fontWeight: '500',
    color: 'rgba(255,255,255,0.80)',
    marginTop: h(2),
  },
  turnCardArrow: {
    marginLeft: w(8),
    opacity: 0.9,
  },

});
