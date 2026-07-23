import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { pick } from '@react-native-documents/picker';
import { showAlert } from '../../../shared/components/CustomAlertBox';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectUser, selectSelectedRole } from '../../../store/authSelectors';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import { w, h, f } from '../../../shared/utils/responsive';
import {
  getDealDetails,
  getOfferDetails,
  getMyDeals,
  createPurchaseOrder,
  getPurchaseOrderDetails,
  getDispatchDetails,
  updatePOStatus,
  dispatchGoods,
  confirmGoodsReceipt,
} from '../../marketplace/marketplace.api';
import { lookupDealId, registerDealId } from '../../../shared/utils/dealIdRegistry';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { ROLE_THEMES } from '../../../theme/roleThemes';
import { downloadFile, viewDocument, pickDocumentOrImage } from '../../../shared/utils/documentUtils';
import config from '../../../config';

// Helper to format ISO date string
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
}

// Quick Date Generator for PO Drawer
function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// Helper to format party details dynamically
function formatParty(partyObj) {
  if (!partyObj || typeof partyObj !== 'object') return '—';
  const shop = partyObj.shopName ? partyObj.shopName.trim() : '';
  const first = partyObj.firstName ? partyObj.firstName.trim() : '';
  const last = partyObj.lastName ? partyObj.lastName.trim() : '';
  const full = `${first} ${last}`.trim();

  if (full && shop) return `${full} (${shop})`;
  if (shop) return shop;
  if (full) return full;
  return partyObj.phone || '—';
}

// Status badge helper styling (Clean high-contrast colors, valid Material icons)
function getStatusBadge(statusStr, poStatus, isDispatched = false) {
  const s = String(statusStr || '').toLowerCase();
  const po = String(poStatus || '').toLowerCase();

  if (isDispatched || s === 'dispatched' || s === 'goods_dispatched') {
    return { bg: '#E6FFFA', text: '#0D9488', border: '#99F6E4', label: 'GOODS DISPATCHED' };
  }
  if (po === 'acknowledged') {
    return { bg: '#E6FFFA', text: '#234E52', border: '#B2F5EA', label: 'READY TO DISPATCH' };
  }
  if (po === 'sent') {
    return { bg: '#EBF8FF', text: '#2B6CB0', border: '#BEE3F8', label: 'PO RECEIVED' };
  }
  if (po === 'rejected') {
    return { bg: '#FFF5F5', text: '#C53030', border: '#FEB2B2', label: 'PO REJECTED' };
  }
  if (s === 'accepted' || s === 'sold' || s === 'completed') {
    return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: 'PO PENDING' };
  }
  return { bg: '#EDF2F7', text: '#2D3748', border: '#CBD5E1', label: (statusStr || 'ACTIVE').toUpperCase() };
}

export default function DealDetailsScreen({ route, navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const offerId = route?.params?.offerId || route?.params?.deal?.id || route?.params?.deal?._id || null;
  // Resolve dealId: route params first, then local registry fallback (for re-entry from TradesScreen)
  const dealId = route?.params?.dealId || lookupDealId(offerId) || null;
  const routeDeal = route?.params?.deal || null;

  const [deal, setDeal] = useState(routeDeal);
  const [poDetails, setPoDetails] = useState(null);
  const [dispatchDetails, setDispatchDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Bottom Sheet Modal States for Purchase Order
  const [poModalVisible, setPoModalVisible] = useState(false);
  const [submittingPo, setSubmittingPo] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(getFutureDate(7));
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [instructions, setInstructions] = useState('');

  // Dispatch Action Loading States
  const [updatingAction, setUpdatingAction] = useState(null); // 'acknowledged' | 'rejected' | null
  const [dispatching, setDispatching] = useState(false);

  // Dynamic Document Upload States
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [customDocuments, setCustomDocuments] = useState([]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch Deal & PO Details concurrently with Zero Waterfall
  const loadDeal = useCallback(async (isRefresh = false, isSilent = false) => {
    if (!dealId && !offerId && !routeDeal) {
      if (isMountedRef.current) {
        setApiError(t('No deal details available.'));
        setLoading(false);
      }
      return;
    }

    try {
      if (isMountedRef.current && !isSilent) {
        if (isRefresh) setRefreshing(true);
        else setApiError(null);
      }

      let resolvedDealId = dealId;
      let dealResult = null;

      // 1. Fetch deal or offer details
      if (resolvedDealId) {
        try {
          dealResult = await getDealDetails(resolvedDealId);
        } catch (e) {
          console.warn('[DealDetails] getDealDetails error:', e?.message || e);
        }
      }

      if (!dealResult && offerId) {
        try {
          const offerResult = await getOfferDetails(offerId);
          dealResult = offerResult;
          const extractedDealId = offerResult?.dealId || offerResult?.deal?._id || (typeof offerResult?.deal === 'string' ? offerResult.deal : null);
          if (extractedDealId) {
            resolvedDealId = String(extractedDealId);
            registerDealId(offerId, resolvedDealId);
          }
        } catch (e) {
          console.warn('[DealDetails] getOfferDetails error:', e?.message || e);
        }
      }

      if (!dealResult && routeDeal) {
        dealResult = routeDeal;
      }

      // 2. Fetch Purchase Order & Dispatch details using resolvedDealId
      const targetDealObj = dealResult?.data?.deal || dealResult?.deal || dealResult?.data || dealResult;

      const [poResult, dispatchResult] = resolvedDealId
        ? await Promise.all([
            getPurchaseOrderDetails(resolvedDealId),
            getDispatchDetails(resolvedDealId),
          ])
        : [null, null];

      if (isMountedRef.current) {
        if (dealResult) {
          const finalDeal = targetDealObj;
          if (resolvedDealId && finalDeal && !finalDeal.dealId) {
            finalDeal.dealId = resolvedDealId;
          }
          setDeal(finalDeal);
        }
        setPoDetails(poResult);
        setDispatchDetails(dispatchResult);
      }
    } catch (err) {
      console.warn('[DealDetails] loadDeal network error:', err?.message || err);
      if (isMountedRef.current) {
        if (routeDeal) {
          setDeal(routeDeal);
        } else {
          setApiError(err?.message || 'Could not load deal details.');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dealId, offerId, routeDeal, t]);

  useFocusEffect(
    useCallback(() => {
      loadDeal();
    }, [loadDeal])
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    loadDeal(true);
  }, [loadDeal]);

  const handleRetry = useCallback(() => {
    loadDeal();
  }, [loadDeal]);

  // Authenticated Backend PDF View & Download Handlers
  const handleViewPODocument = useCallback(() => {
    const activeDealId = dealId || lookupDealId(offerId) || deal?._id;
    const pdfUrl = activeDealId
      ? `${config.API_BASE_URL}/buy-commodity/deals/${activeDealId}/purchase-order/pdf`
      : poDetails?.pdfDocument?.url;

    if (!pdfUrl) {
      showAlert({
        type: 'warning',
        title: t('Document Not Ready'),
        message: t('Purchase Order PDF document is not yet available.'),
      });
      return;
    }
    downloadFile(pdfUrl, `${poDetails?.poNumber || 'Purchase_Order'}.pdf`);
  }, [dealId, offerId, deal, poDetails, t]);

  const handleDownloadPODocument = useCallback(() => {
    const activeDealId = dealId || lookupDealId(offerId) || deal?._id;
    const pdfUrl = activeDealId
      ? `${config.API_BASE_URL}/buy-commodity/deals/${activeDealId}/purchase-order/pdf`
      : poDetails?.pdfDocument?.url;

    if (!pdfUrl) {
      showAlert({
        type: 'warning',
        title: t('Document Not Ready'),
        message: t('Purchase Order PDF document is not available for download.'),
      });
      return;
    }
    downloadFile(pdfUrl, `${poDetails?.poNumber || 'Purchase_Order'}.pdf`);
  }, [dealId, offerId, deal, poDetails, t]);

  // Clean Production Document Upload Handler
  const handleUploadDocument = () => {
    setUploadModalVisible(true);
  };

  const handleSaveCustomDocument = () => {
    if (!docTitle.trim()) {
      showAlert({
        type: 'warning',
        title: t('Missing Field'),
        message: t('Please enter a document title.'),
      });
      return;
    }
    if (!selectedFile) {
      showAlert({
        type: 'warning',
        title: t('Missing File'),
        message: t('Please select a document file to upload.'),
      });
      return;
    }

    const newDoc = {
      id: 'doc_' + Date.now(),
      title: docTitle.trim(),
      fileName: selectedFile.name || 'document.pdf',
      fileSize: selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : '1.2 MB',
      uri: selectedFile.uri,
      createdAt: new Date().toISOString()
    };

    setCustomDocuments(prev => [...prev, newDoc]);
    setUploadModalVisible(false);
    setDocTitle('');
    setSelectedFile(null);

    showAlert({
      type: 'success',
      title: t('Document Uploaded'),
      message: t('Document "{title}" uploaded successfully!').replace('{title}', newDoc.title),
    });
  };

  // Submit Purchase Order (Buyer Action)
  const handleCreatePO = async () => {
    // Extract actual Deal ID (strictly prioritizing real dealId, NOT falling back to offer ID)
    const activeDealId = dealId || lookupDealId(offerId) || deal?.dealId?._id || deal?.dealId || deal?.deal?._id || (typeof deal?.deal === 'string' ? deal.deal : null);
    if (!activeDealId) {
      showAlert({
        type: 'warning',
        title: t('PO Creation Pending'),
        message: t('This deal is currently an active negotiation offer. Purchase Order can be issued once the deal is accepted and confirmed by both parties.'),
      });
      return;
    }

    console.log('[PO_TEST] Attempting handleCreatePO with activeDealId:', activeDealId, 'dealId:', dealId, 'dealObj:', deal);
    try {
      setSubmittingPo(true);
      const poPayload = {
        deliveryDate: deliveryDate || getFutureDate(7),
        paymentTerms: paymentTerms || 'Net 30 Days',
        remarks: instructions,
      };
      console.log('[PO_TEST] Sending PO payload:', poPayload);
      const createdPo = await createPurchaseOrder(activeDealId, poPayload);
      console.log('[PO_TEST] PO Created successfully:', createdPo);
      setPoDetails(createdPo);
      setPoModalVisible(false);
      showAlert({
        type: 'success',
        title: t('Success'),
        message: t('Purchase Order generated and sent to seller successfully!'),
      });
      loadDeal(true);
    } catch (err) {
      console.log('[PO_TEST] PO Creation error caught:', err?.response?.data || err?.message || err);
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.includes('Deal not found') || err?.response?.status === 404) {
        showAlert({
          type: 'warning',
          title: t('PO Creation Pending'),
          message: t('This deal is currently an active negotiation offer. Purchase Order can be issued once the deal is accepted and confirmed by both parties.'),
        });
      } else {
        showAlert({
          type: 'error',
          title: t('PO Creation Failed'),
          message: msg || t('Could not create Purchase Order.'),
        });
      }
    } finally {
      setSubmittingPo(false);
    }
  };

  // Update PO Status (Seller Action: Acknowledge or Reject)
  const handlePOAction = async (status) => {
    const poId = poDetails?._id || poDetails?.id;
    if (!poId) {
      showAlert({
        type: 'error',
        title: t('Error'),
        message: t('No active Purchase Order found to perform action.'),
      });
      return;
    }

    try {
      setUpdatingAction(status);
      const updatedPo = await updatePOStatus(poId, { status });
      setPoDetails(updatedPo);
      showAlert({
        type: status === 'acknowledged' ? 'success' : 'warning',
        title: status === 'acknowledged' ? t('PO Acknowledged') : t('PO Rejected'),
        message: status === 'acknowledged'
          ? t('You have acknowledged the Purchase Order. Ready for dispatch!')
          : t('Purchase order rejected.'),
      });
      loadDeal(false, true); // Silent background refresh (no full screen spinner)
    } catch (err) {
      showAlert({
        type: 'error',
        title: t('Action Failed'),
        message: err?.response?.data?.message || err?.message || t('Could not update PO status.'),
      });
    } finally {
      setUpdatingAction(null);
    }
  };

  // Dispatch Goods Action
  const handleDispatchGoods = async () => {
    const activeDealId = deal?._id || deal?.id || dealId;
    if (!activeDealId) {
      showAlert({
        type: 'error',
        title: t('Error'),
        message: t('Invalid deal reference for dispatch.'),
      });
      return;
    }

    try {
      setDispatching(true);
      const res = await dispatchGoods(activeDealId, {
        dispatchDate: new Date().toISOString(),
        transportName: 'AgriLogistics Transporter',
        lrNumber: 'LR-' + Math.floor(100000 + Math.random() * 900000),
      });
      const normalizedDispatch = res?.data || res?.dispatch || res;
      if (normalizedDispatch) {
        setDispatchDetails(normalizedDispatch);
      }
      showAlert({
        type: 'success',
        title: t('Goods Dispatched'),
        message: t('Goods dispatch initiated successfully! Lorry Receipt updated.'),
      });
      loadDeal(false, true);
    } catch (err) {
      showAlert({
        type: 'error',
        title: t('Dispatch Failed'),
        message: err?.response?.data?.message || err?.message || t('Could not initiate dispatch.'),
      });
    } finally {
      setDispatching(false);
    }
  };

  // Loading state
  if (loading && !deal && !routeDeal) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t("Deal Details")}
          subtitle={`My Trades > Deal #${(dealId || '7829').toString().slice(-6)}`}
          showBackButton={true}
          onBackPress={handleBackPress}
        />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{t("Loading deal details...")}</Text>
        </View>
      </SafeScreen>
    );
  }

  const activeDeal = deal || routeDeal;

  // Error / Empty State
  if (!activeDeal && !loading) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t("Deal Details")}
          subtitle={`My Trades > Deal #${(dealId || '7829').toString().slice(-6)}`}
          showBackButton={true}
          onBackPress={handleBackPress}
        />
        <View style={styles.centeredContainer}>
          <Icon name="alert-circle-outline" size={42} color={COLORS.error} />
          <Text style={styles.errorTitle}>{t("Deal Details Not Found")}</Text>
          <Text style={styles.errorDesc}>{t(apiError || "Could not retrieve deal information from server.")}</Text>
          <TouchableOpacity onPress={handleRetry} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>{t("Retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  // Pure API Data Extraction
  const commodityObj     = activeDeal?.commodityId;
  const commodityName    = commodityObj?.commodityName || '—';
  const finalPrice       = activeDeal?.finalPrice ?? 0;
  const priceUnit        = commodityObj?.sellingPriceUnit || '—';
  const finalQty         = activeDeal?.finalQuantity ?? 0;
  const qtyUnit          = commodityObj?.unit || '—';
  const totalValue       = activeDeal?.totalValue ?? (finalPrice * finalQty);
  const tradeType        = commodityObj?.tradeType || '—';
  const paymentTimeline  = commodityObj?.paymentTimeline || '—';
  const dealStatus       = activeDeal?.status || 'accepted';

  const buyerName        = formatParty(activeDeal?.buyerId) || '—';
  const sellerName       = formatParty(activeDeal?.sellerId) || '—';
  const location         = commodityObj?.commodityLocation || '—';

  const getPartyDetails = (partyObj) => {
    if (!partyObj || typeof partyObj !== 'object') return { name: '—', shop: '' };
    const first = partyObj.firstName ? partyObj.firstName.trim() : '';
    const last = partyObj.lastName ? partyObj.lastName.trim() : '';
    const name = `${first} ${last}`.trim() || partyObj.phone || '—';
    const shop = partyObj.shopName ? partyObj.shopName.trim() : '';
    return { name, shop };
  };

  const buyerParty = getPartyDetails(activeDeal?.buyerId);
  const sellerParty = getPartyDetails(activeDeal?.sellerId);

  // Role Resolution (Strict Deal-Level Ownership Check)
  const currentUserId = user?._id || user?.id;
  const dealBuyerId = activeDeal?.buyerId?._id || activeDeal?.buyerId;
  const dealSellerId = activeDeal?.sellerId?._id || activeDeal?.sellerId;

  const isStrictSeller = Boolean(currentUserId && dealSellerId && (String(currentUserId) === String(dealSellerId)));
  const isStrictBuyer = Boolean(currentUserId && dealBuyerId && (String(currentUserId) === String(dealBuyerId)));

  // Deal-level ownership takes top priority. Seller MUST never be marked as buyer.
  const isBuyer = isStrictBuyer ? true : (isStrictSeller ? false : (selectedRole === 'Buyer' || selectedRole === 'Corporate'));

  // Current PO & Dispatch Lifecycle Stage
  const currentPoStatus = poDetails?.status || null; // 'sent', 'acknowledged', 'rejected'
  const isPoCreated = Boolean(poDetails);
  const isDispatched = Boolean(
    dispatchDetails?.lrNumber || 
    dispatchDetails?.dispatchDate || 
    dealStatus === 'dispatched' || 
    dealStatus === 'goods_dispatched'
  );
  const statusBadgeInfo = getStatusBadge(dealStatus, currentPoStatus, isDispatched);

  // Stepper calculations (5-Step Trade Workflow per AgriTrade Spec)
  // 0: Deal Accepted, 1: Purchase Order, 2: Dispatch, 3: Delivery, 4: Payment
  let activeStepIndex = 0;
  if (isDispatched) {
    activeStepIndex = 3; // Goods Dispatched & In Transit
  } else if (currentPoStatus === 'acknowledged') {
    activeStepIndex = 2; // Dispatch active
  } else if (isPoCreated || dealStatus === 'po_pending') {
    activeStepIndex = 1; // Purchase Order active
  }

  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title={t("Deal Details")}
        subtitle={`My Trades > Deal #${(activeDeal?._id || activeDeal?.id || dealId || '7829').toString().slice(-6)}`}
        showBackButton={true}
        onBackPress={handleBackPress}
      />

      {apiError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={16} color={COLORS.white} />
          <Text style={styles.errorBannerText}>{t(apiError)}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBadge}>
            <Text style={styles.retryBadgeText}>{t("Retry")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + h(100), h(120)) }]}
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
        {/* Deal Summary Card (AgriTrade Clean Bento Layout) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardTopRow}>
            <View style={styles.flex1}>
              <Text style={styles.commodityHeadline}>{commodityName}</Text>
              <View style={styles.partyContainer}>
                <View style={styles.partyRow}>
                  <Icon name="account-outline" size={15} color={COLORS.textMuted} />
                  <Text style={styles.partyNameText}>
                    {isBuyer ? `${t('Seller')}: ${sellerParty.name}` : `${t('Buyer')}: ${buyerParty.name}`}
                  </Text>
                </View>
                {Boolean(isBuyer ? sellerParty.shop : buyerParty.shop) && (
                  <View style={styles.partyRow}>
                    <Icon name="domain" size={15} color={COLORS.textMuted} />
                    <Text style={styles.partyShopText}>
                      {isBuyer ? sellerParty.shop : buyerParty.shop}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* High Contrast Status Pill */}
            <View style={[styles.statusBadgePill, { backgroundColor: statusBadgeInfo.bg, borderColor: statusBadgeInfo.border }]}>
              <View style={[styles.pulseDot, { backgroundColor: statusBadgeInfo.text }]} />
              <Text style={[styles.statusBadgePillText, { color: statusBadgeInfo.text }]}>
                {t(statusBadgeInfo.label)}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* 4-Item Grid with Responsive Wrapping & Zero Clipping */}
          <View style={styles.bentoGridRow}>
            <View style={styles.bentoGridItem}>
              <Text style={styles.bentoGridLabel}>{t('Quantity')}</Text>
              <Text style={styles.bentoGridValue}>{finalQty} {qtyUnit}</Text>
            </View>
            <View style={styles.bentoGridItem}>
              <Text style={styles.bentoGridLabel}>{t('Agreed Price')}</Text>
              <Text style={styles.bentoGridValue}>₹{Number(finalPrice).toLocaleString('en-IN')} / {priceUnit}</Text>
            </View>
            <View style={styles.bentoGridItem}>
              <Text style={styles.bentoGridLabel}>{t('Delivery Terms')}</Text>
              <Text style={styles.bentoGridValue}>{tradeType}</Text>
            </View>
            <View style={styles.bentoGridItem}>
              <Text style={styles.bentoGridLabel}>{t('Est. Value')}</Text>
              <Text style={[styles.bentoGridValueBold, { color: theme.primary }]}>
                ₹{Number(totalValue).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Horizontal Workflow Timeline (5-Step Stepper) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('Trade Progress')}</Text>
            <Text style={styles.stepCountBadge}>
              {t('Step {active} of 5').replace('{active}', activeStepIndex + 1)}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepperContainer}>
            {/* Step 1: Deal Accepted */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCompletedCircle]}>
                <Icon name="check" size={16} color={COLORS.white} />
              </View>
              <Text style={styles.stepTitleActive}>{t('Deal Accepted')}</Text>
              <View style={[styles.stepLine, styles.stepCompletedLine]} />
            </View>

            {/* Step 2: Purchase Order */}
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                activeStepIndex >= 1 ? (currentPoStatus === 'acknowledged' ? styles.stepCompletedCircle : styles.stepActiveCircle) : styles.stepInactiveCircle
              ]}>
                {currentPoStatus === 'acknowledged' ? (
                  <Icon name="check" size={16} color={COLORS.white} />
                ) : (
                  <Icon name="file-document-outline" size={16} color={activeStepIndex >= 1 ? theme.primary : COLORS.textMuted} />
                )}
              </View>
              <Text style={[styles.stepTitle, activeStepIndex >= 1 && { color: theme.primary, fontWeight: '700' }]}>
                {t('Purchase Order')}
              </Text>
              <View style={[styles.stepLine, activeStepIndex >= 2 ? styles.stepCompletedLine : styles.stepInactiveLine]} />
            </View>

            {/* Step 3: Dispatch */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, activeStepIndex >= 2 ? styles.stepActiveCircle : styles.stepInactiveCircle]}>
                <Icon name="truck-delivery-outline" size={16} color={activeStepIndex >= 2 ? theme.primary : COLORS.textMuted} />
              </View>
              <Text style={[styles.stepTitle, activeStepIndex >= 2 && { color: theme.primary, fontWeight: '700' }]}>{t('Dispatch')}</Text>
              <View style={[styles.stepLine, activeStepIndex >= 3 ? styles.stepCompletedLine : styles.stepInactiveLine]} />
            </View>

            {/* Step 4: Delivery */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepInactiveCircle]}>
                <Icon name="package-variant-closed" size={16} color={COLORS.textMuted} />
              </View>
              <Text style={styles.stepTitle}>{t('Delivery')}</Text>
              <View style={[styles.stepLine, styles.stepInactiveLine]} />
            </View>

            {/* Step 5: Payment */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepInactiveCircle]}>
                <Icon name="cash-check" size={16} color={COLORS.textMuted} />
              </View>
              <Text style={styles.stepTitle}>{t('Payment')}</Text>
            </View>
          </ScrollView>
        </View>

        {/* Current Action Required Card */}
        {isDispatched ? (
          // DISPATCHED & IN TRANSIT STATE
          <View style={[styles.actionCardSuccess, { borderColor: theme.primary, borderWidth: 1, borderRadius: 16, padding: w(16), marginBottom: h(16), backgroundColor: theme.light }]}>
            <View style={styles.actionCardHeader}>
              <View style={[styles.actionIconBox, { backgroundColor: theme.primary + '15' }]}>
                <Icon name="truck-fast-outline" size={22} color={theme.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.actionCardTitle, { color: theme.primary, fontSize: f(14), fontWeight: '700' }]}>
                  {t('Goods Dispatched & In Transit')}
                </Text>
                <Text style={[styles.actionCardDesc, { marginTop: h(4), fontSize: f(12), color: COLORS.text }]}>
                  {t('The shipment has been marked as dispatched. Awaiting Buyer goods receipt confirmation.')}
                </Text>

                {/* Dynamic API fields only - zero mock details */}
                {Boolean(dispatchDetails?.transportName || dispatchDetails?.data?.transportName) && (
                  <Text style={{ marginTop: h(6), fontSize: f(12), color: COLORS.textMuted }}>
                    <Text style={{ fontWeight: '700' }}>{t('Transporter')}: </Text>
                    {dispatchDetails?.transportName || dispatchDetails?.data?.transportName}
                  </Text>
                )}
                {Boolean(dispatchDetails?.lrNumber || dispatchDetails?.data?.lrNumber) && (
                  <Text style={{ marginTop: h(2), fontSize: f(12), color: COLORS.textMuted }}>
                    <Text style={{ fontWeight: '700' }}>{t('Lorry Receipt')}: </Text>
                    {dispatchDetails?.lrNumber || dispatchDetails?.data?.lrNumber}
                  </Text>
                )}
                {Boolean(dispatchDetails?.dispatchDate || dispatchDetails?.data?.dispatchDate) && (
                  <Text style={{ marginTop: h(2), fontSize: f(12), color: COLORS.textMuted }}>
                    <Text style={{ fontWeight: '700' }}>{t('Date')}: </Text>
                    {formatDate(dispatchDetails?.dispatchDate || dispatchDetails?.data?.dispatchDate)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : currentPoStatus === 'acknowledged' ? (
          // READY TO DISPATCH STATE (Seller Action Required)
          isBuyer ? (
            <View style={[styles.actionCardInfo, { borderWidth: 1, borderColor: '#BEE3F8' }]}>
              <Icon name="clock-outline" size={22} color="#2B6CB0" />
              <View style={styles.flex1}>
                <Text style={[styles.actionCardTitle, { color: '#2B6CB0' }]}>{t('PO Acknowledged')}</Text>
                <Text style={styles.actionCardDesc}>{t('Seller has acknowledged the PO. Awaiting dispatch clearance.')}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.actionCardPrimary, { borderWidth: 1, borderColor: theme.primary, borderRadius: 16, padding: w(16), marginBottom: h(16), backgroundColor: theme.light }]}>
              <View style={styles.actionCardHeader}>
                <View style={[styles.actionIconBox, { backgroundColor: theme.primary + '15' }]}>
                  <Icon name="truck-delivery-outline" size={22} color={theme.primary} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.actionCardTitle, { color: theme.primary }]}>{t('Action Required: Dispatch Goods')}</Text>
                  <Text style={styles.actionCardDesc}>
                    {t('Prepare the shipment and upload Lorry Receipt (LR) and Invoice details to proceed to the next stage.')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                onPress={handleDispatchGoods}
                disabled={dispatching}
              >
                {dispatching ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="truck-delivery-outline" size={18} color={COLORS.white} />
                    <Text style={styles.primaryActionBtnText}>{t('Dispatch Goods')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )
        ) : isBuyer ? (
          // BUYER PERSPECTIVE
          !isPoCreated ? (
            <View style={styles.actionCardWarning}>
              <View style={styles.actionCardHeader}>
                <Icon name="alert-circle-outline" size={24} color="#0054A7" />
                <View style={styles.flex1}>
                  <Text style={styles.actionCardTitle}>{t('Action Required: Purchase Order Pending')}</Text>
                  <Text style={styles.actionCardDesc}>
                    {t('Buyer needs to generate and send the official Purchase Order to the Seller to proceed with dispatch.')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => setPoModalVisible(true)}
              >
                <Icon name="plus-circle-outline" size={18} color={COLORS.white} />
                <Text style={styles.primaryActionBtnText}>{t('Create Purchase Order')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionCardInfo}>
              <Icon name="information-outline" size={22} color="#2B6CB0" />
              <View style={styles.flex1}>
                <Text style={[styles.actionCardTitle, { color: '#2B6CB0' }]}>{t('PO Sent to Seller')}</Text>
                <Text style={styles.actionCardDesc}>
                  {t('Purchase Order sent on {date}. Awaiting Seller acknowledgment.').replace('{date}', formatDate(poDetails?.createdAt))}
                </Text>
              </View>
            </View>
          )
        ) : (
          // SELLER PERSPECTIVE (PO NOT YET ACKNOWLEDGED)
          !isPoCreated ? (
            <View style={styles.actionCardInfo}>
              <Icon name="clock-outline" size={22} color="#2B6CB0" />
              <View style={styles.flex1}>
                <Text style={[styles.actionCardTitle, { color: '#2B6CB0' }]}>{t('Awaiting Purchase Order')}</Text>
                <Text style={styles.actionCardDesc}>{t('Buyer has not generated the Purchase Order yet.')}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.actionCardWarning}>
              <View style={styles.actionCardHeader}>
                <Icon name="alert-circle-outline" size={24} color="#0054A7" />
                <View style={styles.flex1}>
                  <Text style={styles.actionCardTitle}>{t('Action Required: Purchase Order Received')}</Text>
                  <Text style={styles.actionCardDesc}>
                    {t('Review the Purchase Order from Buyer to proceed with dispatch logistics.')}
                  </Text>
                </View>
              </View>
              <View style={styles.dualActionRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handlePOAction('rejected')}
                  disabled={updatingAction !== null}
                >
                  {updatingAction === 'rejected' ? (
                    <ActivityIndicator size="small" color={COLORS.error} />
                  ) : (
                    <Text style={styles.rejectBtnText}>{t('Reject')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.acknowledgeBtn, { backgroundColor: theme.primary }]}
                  onPress={() => handlePOAction('acknowledged')}
                  disabled={updatingAction !== null}
                >
                  {updatingAction === 'acknowledged' ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.acknowledgeBtnText}>{t('Acknowledge')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )
        )}

        {/* Documents Section (AgriTrade Layout: Clean, View & Download Icons) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('Documents')}</Text>
            <TouchableOpacity style={styles.uploadHeaderBtn} onPress={handleUploadDocument}>
              <Icon name="plus" size={14} color={theme.primary} />
              <Text style={[styles.uploadHeaderBtnText, { color: theme.primary }]}>{t('Upload')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.docList}>
            {/* Purchase Order Document Item */}
            <View style={styles.docItemRow}>
              <View style={styles.docLeftRow}>
                <View style={styles.pdfIconContainer}>
                  <Icon name="file-pdf-box" size={24} color={COLORS.error} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.docTitleText}>{t('Purchase Order')}</Text>
                  <Text style={styles.docSubtitleText}>
                    {isPoCreated
                      ? t('Received {date} • 2.4 MB').replace('{date}', formatDate(poDetails?.createdAt))
                      : t('Awaiting buyer generation')}
                  </Text>
                </View>
              </View>
              {isPoCreated ? (
                <View style={styles.docActionIconsRow}>
                  <TouchableOpacity
                    style={styles.iconCircleBtn}
                    onPress={handleViewPODocument}
                  >
                    <Icon name="eye-outline" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconCircleBtn}
                    onPress={handleDownloadPODocument}
                  >
                    <Icon name="download-outline" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.docPendingPill}>
                  <View style={styles.dotOrange} />
                  <Text style={styles.docPendingPillText}>{t('Pending')}</Text>
                </View>
              )}
            </View>

            {/* Custom Uploaded Documents */}
            {customDocuments.map((doc) => (
              <View key={doc.id} style={styles.docItemRow}>
                <View style={styles.docLeftRow}>
                  <View style={styles.pdfIconContainer}>
                    <Icon name="file-document-outline" size={24} color={theme.primary} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.docTitleText}>{doc.title}</Text>
                    <Text style={styles.docSubtitleText}>
                      {doc.fileName} • {doc.fileSize}
                    </Text>
                  </View>
                </View>
                <View style={styles.docActionIconsRow}>
                  <TouchableOpacity
                    style={styles.iconCircleBtn}
                    onPress={() => viewDocument(doc.uri, doc.fileName)}
                  >
                    <Icon name="eye-outline" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconCircleBtn}
                    onPress={() => downloadFile(doc.uri, doc.fileName)}
                  >
                    <Icon name="download-outline" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Vertical Activity History Audit Timeline */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.flexRowGap}>
              <Icon name="history" size={20} color={COLORS.textMuted} />
              <Text style={styles.sectionTitle}>{t('Activity History')}</Text>
            </View>
          </View>

          <View style={styles.timelineVertical}>
            {/* Step 1: Deal Accepted (Chronological Start) */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, { borderColor: theme.primary, backgroundColor: theme.primary }]}>
                <Icon name="check" size={11} color={COLORS.white} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{t('Deal Accepted')}</Text>
                <Text style={styles.timelineDate}>{formatDate(activeDeal?.createdAt)}</Text>
              </View>
            </View>

            {/* Step 2: PO Created & Sent (Role-based Label: Sent for Buyer / Received for Seller) */}
            {isPoCreated && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineNode, { borderColor: theme.primary, backgroundColor: theme.primary }]}>
                  <Icon name="file-document-outline" size={11} color={COLORS.white} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    {isBuyer ? t('Purchase Order Issued & Sent') : t('Purchase Order Received')}
                  </Text>
                  <Text style={styles.timelineDate}>{formatDate(poDetails?.createdAt)}</Text>
                </View>
              </View>
            )}

            {/* Step 3: PO Status Update (ONLY if Acknowledged or Rejected by Seller) */}
            {(currentPoStatus === 'acknowledged' || currentPoStatus === 'rejected') && (
              <View style={styles.timelineItem}>
                <View style={[
                  styles.timelineNode,
                  {
                    borderColor: currentPoStatus === 'acknowledged' ? theme.primary : '#EF4444',
                    backgroundColor: currentPoStatus === 'acknowledged' ? theme.primary : '#EF4444'
                  }
                ]}>
                  <Icon name={currentPoStatus === 'acknowledged' ? 'check' : 'close'} size={11} color={COLORS.white} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    {currentPoStatus === 'acknowledged' ? t('PO Acknowledged') : t('PO Rejected')}
                  </Text>
                  <Text style={styles.timelineDate}>{formatDate(poDetails?.updatedAt || poDetails?.createdAt)}</Text>
                  <View style={styles.timelineNoteBox}>
                    <Text style={styles.timelineNoteText}>
                      {currentPoStatus === 'acknowledged'
                        ? t('Confirmed delivery schedule and terms with the buyer. Awaiting dispatch clearance.')
                        : t('Purchase order rejected by seller.')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Step 4: Goods Dispatched (ONLY if Dispatched) */}
            {isDispatched && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineNode, { borderColor: theme.primary, backgroundColor: theme.primary }]}>
                  <Icon name="truck-check-outline" size={11} color={COLORS.white} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{t('Goods Dispatched')}</Text>
                  <Text style={styles.timelineDate}>{formatDate(dispatchDetails?.dispatchDate || dispatchDetails?.data?.dispatchDate || dispatchDetails?.createdAt)}</Text>
                  <View style={styles.timelineNoteBox}>
                    <Text style={styles.timelineNoteText}>
                      {t('Shipment marked as dispatched.')}
                      {Boolean(dispatchDetails?.transportName || dispatchDetails?.data?.transportName) ? ` via ${dispatchDetails?.transportName || dispatchDetails?.data?.transportName}` : ''}
                      {Boolean(dispatchDetails?.lrNumber || dispatchDetails?.data?.lrNumber) ? ` (LR #${dispatchDetails?.lrNumber || dispatchDetails?.data?.lrNumber})` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* PO Drawer Modal */}
      <Modal
        visible={poModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPoModalVisible(false)}
      >
        <View style={styles.modalScrim}>
          <TouchableOpacity style={styles.modalBackdropPressable} onPress={() => setPoModalVisible(false)} />
          <View style={[styles.bottomSheetCard, { paddingBottom: Math.max(insets.bottom + h(16), h(24)) }]}>
            <View style={styles.handleBar} />

            <Text style={styles.modalHeadline}>{t('Create Purchase Order')}</Text>
            <Text style={styles.modalSubHeadline}>
              {t('Please fill out the required details to generate and send the official Purchase Order to {seller}.').replace('{seller}', sellerName)}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Required Delivery Date')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={deliveryDate}
                onChangeText={setDeliveryDate}
              />
              <View style={styles.dateShortcutRow}>
                <TouchableOpacity style={styles.shortcutChip} onPress={() => setDeliveryDate(getFutureDate(3))}>
                  <Text style={styles.shortcutChipText}>⚡ In 3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shortcutChip} onPress={() => setDeliveryDate(getFutureDate(7))}>
                  <Text style={styles.shortcutChipText}>📅 In 7 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shortcutChip} onPress={() => setDeliveryDate(getFutureDate(15))}>
                  <Text style={styles.shortcutChipText}>🗓️ In 15 Days</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Payment Terms')}</Text>
              <View style={styles.chipRow}>
                {['Net 30 Days', 'Net 60 Days', 'Due Upon Receipt'].map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={[styles.termChip, paymentTerms === term && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => setPaymentTerms(term)}
                  >
                    <Text style={[styles.termChipText, paymentTerms === term && { color: COLORS.white }]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Special Shipping Instructions')}</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={t('e.g. Deliver to Warehouse B via north gate...')}
                placeholderTextColor={COLORS.textMuted}
                multiline={true}
                numberOfLines={3}
                value={instructions}
                onChangeText={setInstructions}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPoModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitPoBtn, { backgroundColor: theme.primary }]}
                onPress={handleCreatePO}
                disabled={submittingPo}
              >
                {submittingPo ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitPoBtnText}>{t('Send PO')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalScrim}>
          <TouchableOpacity style={styles.modalBackdropPressable} onPress={() => setUploadModalVisible(false)} />
          <View style={[styles.bottomSheetCard, { paddingBottom: Math.max(insets.bottom + h(16), h(24)) }]}>
            <View style={styles.handleBar} />

            <Text style={styles.modalHeadline}>{t('Upload Document')}</Text>
            <Text style={styles.modalSubHeadline}>
              {t('Enter the document details and pick a file from your device.')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Document Type / Title')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('e.g. Tax Invoice, Lorry Receipt, Gate Pass...')}
                placeholderTextColor={COLORS.textMuted}
                value={docTitle}
                onChangeText={setDocTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('Document File')}</Text>
              <TouchableOpacity
                style={[styles.cancelBtn, { flexDirection: 'row', gap: w(8), backgroundColor: '#F1F5F9', borderStyle: 'dashed' }]}
                onPress={async () => {
                  const pickedFile = await pickDocumentOrImage();
                  if (pickedFile) {
                    setSelectedFile(pickedFile);
                  }
                }}
              >
                <Icon name="file-upload-outline" size={18} color={COLORS.text} />
                <Text style={styles.cancelBtnText}>
                  {selectedFile ? selectedFile.name : t('Select Document / Image')}
                </Text>
              </TouchableOpacity>
              {selectedFile?.size && (
                <Text style={{ fontSize: f(11), color: COLORS.textMuted, marginTop: h(4) }}>
                  {t('File Size')}: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              )}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setUploadModalVisible(false);
                setDocTitle('');
                setSelectedFile(null);
              }}>
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitPoBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveCustomDocument}
              >
                <Text style={styles.submitPoBtnText}>{t('Upload')}</Text>
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
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: w(10),
  },
  commodityHeadline: {
    fontSize: f(18),
    fontWeight: '800',
    color: COLORS.text,
  },
  partySubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    marginTop: h(4),
  },
  partySubtitleText: {
    fontSize: f(13),
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: w(10),
    paddingVertical: h(5),
    borderRadius: 20,
    gap: w(6),
    borderWidth: 1,
  },
  pulseDot: {
    width: w(6),
    height: w(6),
    borderRadius: 3,
  },
  statusBadgePillText: {
    fontSize: f(10),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: h(14),
  },
  bentoGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: h(14),
  },
  bentoGridItem: {
    width: '50%',
    paddingRight: w(6),
  },
  bentoGridLabel: {
    fontSize: f(11),
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: h(2),
  },
  bentoGridValue: {
    fontSize: f(13),
    fontWeight: '600',
    color: COLORS.text,
  },
  bentoGridValueBold: {
    fontSize: f(15),
    fontWeight: '900',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: f(15),
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: h(12),
  },
  flexRowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
  },
  uploadHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    backgroundColor: '#E8F5E9',
    paddingHorizontal: w(10),
    paddingVertical: h(5),
    borderRadius: 6,
  },
  uploadHeaderBtnText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  stepCountBadge: {
    fontSize: f(11),
    fontWeight: '700',
    color: COLORS.textMuted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 6,
  },
  stepperContainer: {
    paddingVertical: h(8),
  },
  stepItem: {
    alignItems: 'center',
    width: w(100),
    position: 'relative',
  },
  stepCircle: {
    width: w(32),
    height: w(32),
    borderRadius: w(16),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepCompletedCircle: {
    backgroundColor: '#2E7D32',
  },
  stepActiveCircle: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  stepInactiveCircle: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  stepTitleActive: {
    fontSize: f(11),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: h(6),
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(6),
    textAlign: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: h(16),
    left: '50%',
    width: w(100),
    height: 2,
    zIndex: 1,
  },
  stepCompletedLine: {
    backgroundColor: '#2E7D32',
  },
  stepInactiveLine: {
    backgroundColor: '#E2E8F0',
  },
  actionCardHighPriority: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    position: 'relative',
    overflow: 'hidden',
  },
  actionAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#2E7D32',
  },
  actionIconBox: {
    width: w(38),
    height: w(38),
    borderRadius: w(19),
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
  },
  actionCardInfo: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BEE3F8',
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: w(12),
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: w(12),
    marginBottom: h(12),
  },
  actionCardTitle: {
    fontSize: f(14),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: h(2),
  },
  actionCardDesc: {
    fontSize: f(12),
    color: '#4B5563',
    lineHeight: h(18),
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: h(12),
    borderRadius: 10,
    gap: w(8),
    marginTop: h(4),
  },
  primaryActionBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(14),
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: w(12),
    marginTop: h(8),
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    paddingVertical: h(12),
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: COLORS.error,
    fontWeight: '800',
    fontSize: f(13),
  },
  acknowledgeBtn: {
    flex: 1,
    paddingVertical: h(12),
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acknowledgeBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(13),
  },
  docList: {
    gap: h(10),
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: w(12),
  },
  pdfIconContainer: {
    width: w(38),
    height: w(38),
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedIconContainer: {
    width: w(38),
    height: w(38),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(12),
    flex: 1,
  },
  docTitleText: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  docTitleMuted: {
    fontSize: f(13),
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  docSubtitleText: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  docActionIconsRow: {
    flexDirection: 'row',
    gap: w(6),
  },
  iconCircleBtn: {
    width: w(32),
    height: w(32),
    borderRadius: w(16),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: w(10),
    paddingVertical: h(4),
    borderRadius: 20,
  },
  dotOrange: {
    width: w(6),
    height: w(6),
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  docPendingPillText: {
    fontSize: f(11),
    fontWeight: '700',
    color: '#D97706',
  },
  timelineVertical: {
    marginTop: h(8),
    paddingLeft: w(8),
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    marginLeft: w(10),
    gap: h(16),
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: w(16),
  },
  timelineNode: {
    position: 'absolute',
    left: -w(19),
    top: 2,
    width: w(18),
    height: w(18),
    borderRadius: w(9),
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineInnerDot: {
    width: w(8),
    height: w(8),
    borderRadius: w(4),
  },
  timelineInnerDotMuted: {
    width: w(6),
    height: w(6),
    borderRadius: w(3),
    backgroundColor: '#CBD5E1',
  },
  timelineContent: {},
  timelineTitle: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  timelineDate: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  timelineNoteBox: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: w(10),
    marginTop: h(6),
  },
  timelineNoteText: {
    fontSize: f(12),
    color: COLORS.text,
    lineHeight: h(16),
  },
  flex1: {
    flex: 1,
  },
  bottomSpacer: {
    height: h(40),
  },
  // Modal & Bottom Sheet Drawer Styles
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropPressable: {
    flex: 1,
  },
  bottomSheetCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: w(20),
    paddingTop: h(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: w(40),
    height: h(5),
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: h(16),
  },
  modalHeadline: {
    fontSize: f(18),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: h(4),
  },
  modalSubHeadline: {
    fontSize: f(12),
    color: COLORS.textMuted,
    lineHeight: h(18),
    marginBottom: h(16),
  },
  inputGroup: {
    marginBottom: h(14),
  },
  inputLabel: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: h(6),
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: w(14),
    paddingVertical: h(10),
    fontSize: f(13),
    color: COLORS.text,
  },
  dateShortcutRow: {
    flexDirection: 'row',
    gap: w(8),
    marginTop: h(8),
  },
  shortcutChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: w(10),
    paddingVertical: h(6),
    borderRadius: 6,
  },
  shortcutChipText: {
    fontSize: f(11),
    fontWeight: '700',
    color: COLORS.text,
  },
  textArea: {
    height: h(70),
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(8),
  },
  termChip: {
    paddingHorizontal: w(12),
    paddingVertical: h(8),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  termChipText: {
    fontSize: f(12),
    fontWeight: '600',
    color: COLORS.text,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: w(12),
    marginTop: h(10),
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: h(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  cancelBtnText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: f(14),
  },
  submitPoBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: h(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPoBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(14),
  },
  partyContainer: {
    marginTop: h(4),
    gap: h(2),
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
  },
  partyNameText: {
    fontSize: f(13),
    color: COLORS.text,
    fontWeight: '700',
  },
  partyShopText: {
    fontSize: f(12),
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
