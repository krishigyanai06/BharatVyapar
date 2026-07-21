import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import { showAlert } from '../../../shared/components/CustomAlertBox';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useNegotiationDetail } from '../hooks/useNegotiationDetail';
import { ROLE_THEMES } from '../../../theme/roleThemes';
import { validatePriceMovement } from '../procurement.rules';
import { submitCounterOffer, acceptOffer, rejectOffer } from '../../marketplace/marketplace.api';

// Sub-components
import { CounterOfferBottomSheetModal } from '../components/negotiation/CounterOfferBottomSheetModal';
import { NegotiationTimelineList } from '../components/negotiation/NegotiationTimelineList';
import { NegotiationHeaderCard } from '../components/negotiation/NegotiationHeaderCard';

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
  const user = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const routeOffer = route?.params?.offer;
  const offerId = routeOffer?.id || routeOffer?._id || routeOffer?.offer?.id || routeOffer?.offer?._id || route?.params?.offerId;
  const routeItem = route?.params?.item;

  // Form & Action States
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQty, setCounterQty] = useState('');
  const [counterRemarks, setCounterRemarks] = useState('');
  const [isFinalOffer, setIsFinalOffer] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);

  const onOfferLoaded = useCallback((offerData) => {
    const rounds = offerData?.negotiationHistory || offerData?.rounds || [];
    if (rounds.length > 0) {
      const last = rounds[rounds.length - 1];
      setCounterPrice(String(last.price || ''));
      setCounterQty(String(last.quantity || ''));
    } else {
      setCounterPrice(String(offerData?.price || ''));
      setCounterQty(String(offerData?.quantity || ''));
    }
  }, []);

  const { offer, item, loading, refreshing, apiError, cooldownSecs, refresh, handleRefresh } =
    useNegotiationDetail({ offerId, routeItem, onOfferLoaded, t });

  const rawStatus = (offer?.status || 'pending').toLowerCase();
  const isClosed = ['accepted', 'rejected', 'expired'].includes(rawStatus);
  const userId = user?._id || user?.id;
  const buyerId = offer?.buyerId?._id || offer?.buyerId || offer?.buyer?.id;
  const sellerId = offer?.sellerId?._id || offer?.sellerId || offer?.seller?.id;
  const myRole = (userId && sellerId && String(userId) === String(sellerId)) ? 'seller' : 'buyer';
  const isMyTurn = !isClosed && (offer?.currentTurn === myRole || offer?.current_turn === myRole || !offer?.currentTurn);

  const negotiationRounds = offer?.negotiationHistory || offer?.rounds || [];
  const roundsExhausted = negotiationRounds.length >= 5;

  const handleCounterSubmit = async () => {
    const valResult = validatePriceMovement(offer?.price, counterPrice, myRole.toUpperCase());
    if (!valResult.isValid) {
      setPriceError(valResult.message);
      return;
    }
    setPriceError('');
    setSubmittingAction(true);

    try {
      await submitCounterOffer(offerId, {
        counterPrice: Number(counterPrice),
        counterQty: Number(counterQty),
        remarks: counterRemarks,
        isFinal: isFinalOffer,
      });
      setCounterModalOpen(false);
      refresh();
      showAlert({ type: 'success', title: t('Success'), message: t('Counter offer sent successfully.') });
    } catch (err) {
      showAlert({ type: 'error', title: t('Error'), message: err?.message || t('Failed to send counter offer.') });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAcceptDeal = () => {
    showAlert({
      type: 'confirm',
      title: t('Accept Offer'),
      message: t('Are you sure you want to accept this offer and proceed?'),
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Accept'),
          onPress: async () => {
            setSubmittingAction(true);
            try {
              await acceptOffer(offerId);
              refresh();
              showAlert({ type: 'success', title: t('Deal Closed'), message: t('Offer accepted successfully!') });
            } catch (err) {
              showAlert({ type: 'error', title: t('Error'), message: err?.message || t('Failed to accept deal.') });
            } finally {
              setSubmittingAction(false);
            }
          },
        },
      ],
    });
  };

  const handleDeclineOffer = () => {
    showAlert({
      type: 'confirm',
      title: t('Decline Offer'),
      message: t('Are you sure you want to decline this offer?'),
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Decline'),
          style: 'destructive',
          onPress: async () => {
            setSubmittingAction(true);
            try {
              await rejectOffer(offerId);
              refresh();
              showAlert({ type: 'success', title: t('Offer Declined'), message: t('Offer declined successfully.') });
            } catch (err) {
              showAlert({ type: 'error', title: t('Error'), message: err?.message || t('Failed to decline offer.') });
            } finally {
              setSubmittingAction(false);
            }
          },
        },
      ],
    });
  };

  // Loading Screen
  if (loading && !refreshing) {
    return (
      <SafeScreen style={{ backgroundColor: '#F7FAFC' }}>
        <AppHeader title={t('Negotiation Details')} showBack={true} onBackPress={() => navigation.goBack()} />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeScreen>
    );
  }

  // Error Screen
  if (apiError && !offer) {
    return (
      <SafeScreen style={{ backgroundColor: '#F7FAFC' }}>
        <AppHeader title={t('Negotiation Details')} showBack={true} onBackPress={() => navigation.goBack()} />
        <View style={styles.centeredContainer}>
          <Icon name="alert-circle-outline" size={64} color="#E53E3E" />
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <AppHeader title={t('Negotiation Details')} showBack={true} onBackPress={() => navigation.goBack()} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} />}
      >
        <NegotiationHeaderCard
          item={item}
          offer={offer}
          statusConfig={STATUS_CONFIG}
          theme={theme}
          t={t}
          isMyTurn={isMyTurn}
          isClosed={isClosed}
        />

        <NegotiationTimelineList
          rounds={negotiationRounds}
          myRole={myRole}
          theme={theme}
          t={t}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen(!historyOpen)}
        />
      </ScrollView>

      {/* Footer Action Buttons */}
      {!isClosed && isMyTurn ? (
        <View style={styles.footerRow}>
          {!roundsExhausted ? (
            <TouchableOpacity
              style={[styles.counterBtn, cooldownSecs > 0 && styles.counterBtnDisabled]}
              onPress={() => setCounterModalOpen(true)}
              disabled={cooldownSecs > 0}
            >
              <Text style={[styles.counterBtnText, cooldownSecs > 0 && styles.counterBtnTextDisabled]}>
                {cooldownSecs > 0 ? `${t('Counter Cooldown')} (${cooldownSecs}s)` : t('Counter Offer')}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDeclineOffer}
            disabled={submittingAction}
          >
            {submittingAction ? (
              <ActivityIndicator color="#E53E3E" size="small" />
            ) : (
              <Text style={styles.declineBtnText}>{t('Decline')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
            onPress={handleAcceptDeal}
            disabled={submittingAction}
          >
            {submittingAction ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.acceptBtnText}>{t('Accept Deal')}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <CounterOfferBottomSheetModal
        visible={counterModalOpen}
        onClose={() => setCounterModalOpen(false)}
        onSubmit={handleCounterSubmit}
        counterPrice={counterPrice}
        setCounterPrice={setCounterPrice}
        counterQty={counterQty}
        setCounterQty={setCounterQty}
        counterRemarks={counterRemarks}
        setCounterRemarks={setCounterRemarks}
        isFinalOfferToggle={isFinalOffer}
        setIsFinalOfferToggle={setIsFinalOffer}
        counterPriceError={priceError}
        submittingAction={submittingAction}
        theme={theme}
        t={t}
        itemUnit={offer?.unit || item?.unit || 'Quintal'}
        currentPriceDisplay={offer?.price ? String(offer.price) : ''}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  counterBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: {
    backgroundColor: '#EDF2F7',
    borderColor: '#E2E8F0',
  },
  counterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
  },
  counterBtnTextDisabled: {
    color: '#A0AEC0',
  },
  acceptBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53E3E',
  },
});
