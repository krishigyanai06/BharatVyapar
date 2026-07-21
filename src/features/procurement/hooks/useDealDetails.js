import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { getDealDetails, updateEscrowStatus } from '../../marketplace/marketplace.api';
import { dealService } from '../procurement.api';
import { ROLE_THEMES } from '../../../theme/roleThemes';
import { showAlert } from '../../../shared/components/CustomAlertBox';

export function useDealDetails({ route, navigation, t }) {
  const user = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const rawDealId = route?.params?.dealId || route?.params?.deal?.id || route?.params?.deal?._id;
  const dealId = (typeof rawDealId === 'string' && rawDealId.startsWith('mock')) ? null : rawDealId;
  const routeDeal = route?.params?.deal || null;

  const [deal, setDeal] = useState(routeDeal);
  const [loading, setLoading] = useState(!routeDeal);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [updatingEscrow, setUpdatingEscrow] = useState(false);
  const [showDebitNoteModal, setShowDebitNoteModal] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDeal = useCallback(async (isRefresh = false) => {
    if (!dealId && !routeDeal) {
      if (isMountedRef.current) {
        setApiError(t('No deal ID provided.'));
        setLoading(false);
      }
      return;
    }
    if (!dealId && routeDeal) {
      if (isMountedRef.current) setLoading(false);
      return;
    }
    try {
      if (isMountedRef.current) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setApiError(null);
      }
      const res = await getDealDetails(dealId);
      if (!isMountedRef.current) return;
      const dealData = res?.data?.deal || res?.deal || res?.data || res;
      setDeal(dealData);
    } catch (err) {
      console.warn('[DealDetails] loadDeal error:', err);
      if (isMountedRef.current) {
        setApiError(err?.message || t('Could not load deal details.'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dealId, routeDeal, t]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  const userId = user?._id || user?.id;
  const routeRole = route?.params?.role;
  const isBuyer = routeRole
    ? routeRole === 'buyer'
    : !!(deal && userId &&
        String(deal.buyerId || deal.buyer_id || deal.buyer?.id || deal.buyer?._id) === String(userId));
  const isSeller = routeRole
    ? routeRole === 'seller'
    : !!(deal && userId &&
        String(deal.sellerId || deal.seller_id || deal.seller?.id || deal.seller?._id) === String(userId));

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    loadDeal(true);
  }, [loadDeal]);

  const handleRetry = useCallback(() => {
    loadDeal();
  }, [loadDeal]);

  const handleEscrowUpdate = useCallback((newStatus, confirmTitle, confirmMsg) => {
    const activeDealId = deal?.id || deal?._id || dealId;
    if (!activeDealId) return;

    showAlert({
      type: 'confirm',
      title: confirmTitle,
      message: confirmMsg,
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Confirm'),
          onPress: async () => {
            try {
              setUpdatingEscrow(true);
              await updateEscrowStatus(activeDealId, newStatus);
              showAlert({
                type: 'success',
                title: t('Updated!'),
                message: t('Deal stage updated to "{status}".').replace('{status}', t(newStatus.replace('_', ' '))),
              });
              loadDeal(true);
            } catch (err) {
              console.error('[DealDetails] updateEscrowStatus error:', err);
              showAlert({
                type: 'error',
                title: t('Update Failed'),
                message: err?.message || t('Could not update escrow status. Please try again.'),
              });
            } finally {
              setUpdatingEscrow(false);
            }
          },
        },
      ],
    });
  }, [deal, dealId, loadDeal, t]);

  const handleDispute = useCallback(() => {
    const activeDealId = deal?.id || deal?._id || dealId;
    if (!activeDealId) return;
    setShowDebitNoteModal(true);
  }, [deal, dealId]);

  const handleSubmitDebitNote = useCallback(async (payload) => {
    const activeDealId = deal?.id || deal?._id || dealId;
    if (!activeDealId) return;
    try {
      setUpdatingEscrow(true);
      await dealService.submitDebitNote(activeDealId, payload);
      showAlert({
        type: 'info',
        title: t('Dispute Raised'),
        message: t('Debit note submitted. Our support team will contact you within 24 hours.'),
      });
      loadDeal(true);
    } catch (err) {
      showAlert({
        type: 'error',
        title: t('Failed'),
        message: err?.message || t('Could not raise dispute. Please try again.'),
      });
    } finally {
      setUpdatingEscrow(false);
    }
  }, [deal, dealId, loadDeal, t]);

  const handleOpenContract = useCallback(() => {
    showAlert({
      type: 'info',
      title: t('Contract'),
      message: t('Opening digitally signed tripartite contract agreement.')
    });
  }, [t]);

  const handleOpenInvoice = useCallback(() => {
    showAlert({
      type: 'info',
      title: t('Commercial Invoice'),
      message: t('Opening seller commercial invoice.')
    });
  }, [t]);

  const handleOpenLorryReceipt = useCallback(() => {
    showAlert({
      type: 'info',
      title: t('Lorry Receipt'),
      message: t('Opening transport lorry receipt.')
    });
  }, [t]);

  const handleFundEscrow = useCallback(() => {
    const totalValue = (deal?.finalPrice || deal?.price || 0) * (deal?.finalQuantity || deal?.quantity || 0);
    handleEscrowUpdate(
      'funded',
      t('Confirm Escrow Payment'),
      t('Transfer ₹{amount} to secure escrow account to initiate deal?').replace('{amount}', Number(totalValue).toLocaleString('en-IN'))
    );
  }, [deal, handleEscrowUpdate, t]);

  const handleMarkDispatched = useCallback(async () => {
    const activeDealId = deal?.id || deal?._id || dealId;
    try {
      setUpdatingEscrow(true);
      await dealService.confirmDispatch(activeDealId);
      await updateEscrowStatus(activeDealId, 'dispatched'); 
      loadDeal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingEscrow(false);
    }
  }, [deal, dealId, loadDeal]);

  return {
    deal,
    dealId,
    routeDeal,
    loading,
    refreshing,
    apiError,
    updatingEscrow,
    showDebitNoteModal,
    setShowDebitNoteModal,
    isBuyer,
    isSeller,
    theme,
    handleBackPress,
    handleRefresh,
    handleRetry,
    handleEscrowUpdate,
    handleDispute,
    handleSubmitDebitNote,
    handleOpenContract,
    handleOpenInvoice,
    handleOpenLorryReceipt,
    handleFundEscrow,
    handleMarkDispatched,
  };
}
