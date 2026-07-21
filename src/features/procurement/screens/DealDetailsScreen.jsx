import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import { w, h, f } from '../../../shared/utils/responsive';
import DynamicDocumentUploader from '../../../shared/components/DynamicDocumentUploader';
import { useTranslation } from '../../../shared/hooks/useTranslation';

// Hook and Sub-components
import { useDealDetails } from '../hooks/useDealDetails';
import EscrowProgressStepper from '../components/deal/EscrowProgressStepper';
import DebitNoteBottomSheet from '../components/deal/DebitNoteBottomSheet';
import { dealService } from '../procurement.api';

// Escrow stages for stepper config
const STAGES = [
  { key: 'pending_payment', title: 'Pending Payment', icon: 'cash-clock',     desc: 'Waiting for buyer to fund escrow account.' },
  { key: 'funded',          title: 'Funded',           icon: 'bank-check',     desc: 'Escrow secured. Seller to prepare dispatch.' },
  { key: 'dispatched',      title: 'Dispatched',       icon: 'truck-delivery', desc: 'Goods in transit. Lorry receipt uploaded.' },
  { key: 'delivered',       title: 'Delivered',        icon: 'package-check',  desc: 'Goods received at buyer site. Verifying quality.' },
  { key: 'released',        title: 'Released ✓',       icon: 'check-decagram', desc: 'Funds released to seller. Deal complete!' },
];

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DealDetailsScreen({ route, navigation }) {
  const { t } = useTranslation();
  const hook = useDealDetails({ route, navigation, t });
  const {
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
  } = hook;

  // Stepper states helper mapping
  const escrowStatus   = deal?.escrowStatus || 'pending_payment';
  const isCancelled    = escrowStatus === 'cancelled';
  const isReleased     = escrowStatus === 'released';
  const currentStageIdx = STAGES.findIndex(s => s.key === escrowStatus);

  const stageTimestamps = {
    pending_payment: deal?.createdAt,
    funded:          deal?.fundedAt,
    dispatched:      deal?.dispatchedAt,
    delivered:       deal?.deliveredAt,
    released:        deal?.releasedAt,
  };

  const showFundEscrow   = isBuyer  && escrowStatus === 'pending_payment';
  const showDispatchPO   = isBuyer  && escrowStatus === 'funded';
  const showReadyToDispatch = isSeller && escrowStatus === 'funded';
  const showDispatchDocs = isSeller && escrowStatus === 'dispatched_pending';
  const showConfirmDelivery = isBuyer && escrowStatus === 'dispatched';
  const showAnyAction    = showFundEscrow || showDispatchPO || showReadyToDispatch || showDispatchDocs || showConfirmDelivery;
  const showRaiseDispute = (escrowStatus === 'delivered' || escrowStatus === 'dispatched');

  const finalPrice    = deal?.finalPrice    || deal?.price    || 0;
  const finalQty      = deal?.finalQuantity || deal?.quantity || 0;
  const totalValue    = deal?.totalValue    || (finalPrice * finalQty);
  const commodityName = deal?.commodity?.commodityName || deal?.commodity?.name ||
                        route?.params?.item?.commodityName || route?.params?.item?.name || '—';
  const tradeType     = deal?.tradeType || 'FOR';

  // ─── Missing Deal ID (Fallback UI instead of Error) ────────────────────────
  if (!dealId && !routeDeal) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t("Escrow Deal")}
          showBackButton={true}
          onBackPress={handleBackPress}
        />
        <View style={styles.centeredContainer}>
          <Icon name="check-decagram" size={64} color="#38A169" />
          <Text style={[styles.errorTitle, { color: '#2D3748', marginTop: 16 }]}>
            {t("Order Accepted")}
          </Text>
          <Text style={[styles.errorDesc, { marginTop: 8, fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: 20 }]}>
            {t("Your offer has been accepted! The escrow payment link and dispatch details will be generated shortly. Please check back in a few moments.")}
          </Text>
          <TouchableOpacity 
            style={[styles.retryBtn, { backgroundColor: theme.primary, marginTop: 32 }]} 
            onPress={handleBackPress}
          >
            <Text style={styles.retryBtnText}>{t("Go Back to Offers")}</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t("Escrow Deal")}
          subtitle={dealId || '—'}
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

  // ─── Error (no data) ────────────────────────────────────────────────
  if (apiError && !deal) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t("Escrow Deal")}
          showBackButton={true}
          onBackPress={handleBackPress}
        />
        <View style={styles.centeredContainer}>
          <Icon name="check-decagram" size={64} color="#38A169" />
          <Text style={[styles.errorTitle, { color: '#2D3748', marginTop: 16 }]}>
            {t("Order Accepted")}
          </Text>
          <Text style={[styles.errorDesc, { marginTop: 8, fontSize: 15, lineHeight: 24, textAlign: 'center', paddingHorizontal: 24 }]}>
            {t("Your offer has been accepted! The escrow payment link and deal details will be generated shortly. Please check back in a few moments.")}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.primary, marginTop: 32 }]}
            onPress={handleBackPress}
          >
            <Text style={styles.retryBtnText}>{t("Go Back to Offers")}</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title={t("Escrow Deal")}
        subtitle={deal?.id || dealId || '—'}
        showBackButton={true}
        onBackPress={handleBackPress}
      />

      {apiError && deal && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={15} color={COLORS.white} />
          <Text style={styles.errorBannerText}>{t(apiError)}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBadge}>
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
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Icon name="close-circle" size={22} color={COLORS.error} />
            <View style={styles.flex1}>
              <Text style={styles.cancelledTitle}>{t('Deal Cancelled')}</Text>
              {deal?.cancelReason && (
                <Text style={styles.cancelledDesc}>{t(deal.cancelReason)}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.dealCard}>
          <View style={styles.cardHeader}>
            <View style={styles.flex1}>
              <Text style={styles.commodityTitle}>{commodityName}</Text>
              <Text style={styles.dealMeta}>{t('Deal Date: {date}').replace('{date}', formatDate(deal?.createdAt) || '—')}</Text>
            </View>
            <View style={[styles.badge, styles.badgeRow, { backgroundColor: theme.primary + '15' }]}>
              <Icon name="lock" size={12} color={theme.primary} />
              <Text style={[styles.badgeText, { color: theme.primary }]}>{t('Escrow')}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('Buyer')}</Text>
            <Text style={styles.value}>{deal?.buyer?.name || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('Seller')}</Text>
            <Text style={styles.value}>{deal?.seller?.name || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('Quantity')}</Text>
            <Text style={styles.value}>{finalQty} {deal?.unit || ''}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('Final Price')}</Text>
            <Text style={styles.value}>₹{finalPrice.toLocaleString('en-IN')}/{deal?.priceUnit || 'Qt'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('Total Value')}</Text>
            <Text style={[styles.value, styles.boldValue, { color: theme.primary }]}>
              ₹{Number(totalValue).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('Delivery Basis')}</Text>
            <Text style={styles.value}>{tradeType === 'FOR' ? t('FOR (Freight to Destination)') : t('Ex-Warehouse')}</Text>
          </View>
        </View>

        <EscrowProgressStepper
          escrowStatus={escrowStatus}
          deal={deal}
          STAGES={STAGES}
          theme={theme}
          t={t}
          isCancelled={isCancelled}
          currentStageIdx={currentStageIdx}
          stageTimestamps={stageTimestamps}
        />

        <View style={styles.docsCard}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>{t('Deal Documents')}</Text>

          <TouchableOpacity style={styles.docItem} onPress={handleOpenContract}>
            <View style={styles.docInfo}>
              <Icon name="file-sign" size={22} color="#007799" />
              <View>
                <Text style={styles.docTitle}>{t('Tripartite Contract Agreement.pdf')}</Text>
                <Text style={styles.docMeta}>{t('Signed by Buyer, Seller & Escrow Agent')}</Text>
              </View>
            </View>
            <Icon name="download" size={18} color={COLORS.textLight} />
          </TouchableOpacity>

          {(escrowStatus === 'dispatched' || escrowStatus === 'delivered' || escrowStatus === 'released') && (
            <TouchableOpacity style={styles.docItem} onPress={handleOpenInvoice}>
              <View style={styles.docInfo}>
                <Icon name="file-percent" size={22} color="#D69E2E" />
                <View>
                  <Text style={styles.docTitle}>{t('Commercial Invoice.pdf')}</Text>
                  <Text style={styles.docMeta}>{t('Tax invoice submitted by Seller')}</Text>
                </View>
              </View>
              <Icon name="download" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}

          {(escrowStatus === 'dispatched' || escrowStatus === 'delivered' || escrowStatus === 'released') && (
            <TouchableOpacity style={styles.docItem} onPress={handleOpenLorryReceipt}>
              <View style={styles.docInfo}>
                <Icon name="file-cabinet" size={22} color="#805AD5" />
                <View>
                  <Text style={styles.docTitle}>{t('Lorry Receipt.pdf')}</Text>
                  <Text style={styles.docMeta}>{t('Bill of lading uploaded by Seller')}</Text>
                </View>
              </View>
              <Icon name="download" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {!isCancelled && !isReleased && (
          <View style={styles.actionCard}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>{t('Action Required')}</Text>

            {showFundEscrow && (
              <View style={styles.actionBlock}>
                <View style={styles.actionDesc}>
                  <Icon name="cash-multiple" size={22} color="#3182CE" />
                  <View style={styles.flex1}>
                    <Text style={styles.actionTitle}>{t('Proceed to Payment (PO Upload)')}</Text>
                    <Text style={styles.actionSubtitle}>
                      {t('Transfer ₹{amount} and upload Purchase Order (PO) to secure this deal.').replace('{amount}', Number(totalValue).toLocaleString('en-IN'))}
                    </Text>
                  </View>
                </View>
                <DynamicDocumentUploader 
                  docs={['PURCHASE_ORDER']} 
                  onUpload={async (type, file) => {
                    await dealService.uploadDealDocument(deal?.id || deal?._id, type, file);
                  }}
                  onAllUploaded={() => {
                    handleFundEscrow();
                  }}
                />
              </View>
            )}

            {showReadyToDispatch && (
              <View style={styles.actionBlock}>
                <View style={styles.actionDesc}>
                  <Icon name="truck-delivery" size={22} color="#DD6B20" />
                  <View style={styles.flex1}>
                    <Text style={styles.actionTitle}>{t('Ready to Dispatch?')}</Text>
                    <Text style={styles.actionSubtitle}>
                      {t('Buyer has uploaded PO. Click below to begin uploading dispatch documents (E-Invoice, Kata Parchi, E-Way Bill).')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#DD6B20' }]}
                  disabled={updatingEscrow}
                  onPress={() => handleEscrowUpdate('dispatched_pending', 'Ready to Dispatch', 'Begin dispatch document upload?')}
                >
                  {updatingEscrow ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Icon name="truck-fast" size={18} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>{t('Ready to Dispatch')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {showDispatchDocs && (
              <View style={styles.actionBlock}>
                <View style={styles.actionDesc}>
                  <Icon name="file-document-multiple-outline" size={22} color="#DD6B20" />
                  <View style={styles.flex1}>
                    <Text style={styles.actionTitle}>{t('Upload Dispatch Documents')}</Text>
                    <Text style={styles.actionSubtitle}>
                      {t('Please upload the following 3 documents. The Confirm button will enable once all are uploaded.')}
                    </Text>
                  </View>
                </View>
                
                <DynamicDocumentUploader 
                  docs={['E-Invoice', 'Kata Parchi', 'E-Way Bill']} 
                  onUpload={async (type, file) => {
                    await dealService.uploadDealDocument(deal?.id || deal?._id, type, file);
                  }}
                  onAllUploaded={(done) => {
                    if (done) handleMarkDispatched();
                  }}
                />
              </View>
            )}

            {showConfirmDelivery && (
              <View style={styles.actionBlock}>
                <View style={styles.actionDesc}>
                  <Icon name="package-check" size={22} color="#38A169" />
                  <View style={styles.flex1}>
                    <Text style={styles.actionTitle}>{t('Confirm Delivery')}</Text>
                    <Text style={styles.actionSubtitle}>
                      {t('Goods have arrived? Confirm receipt to trigger quality inspection and fund release.')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#38A169' }]}
                  disabled={updatingEscrow}
                  onPress={handleConfirmDelivery}
                >
                  {updatingEscrow ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Icon name="check-circle" size={18} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>{t('Confirm Delivery')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!showAnyAction && !isCancelled && !isReleased && (
              <View style={styles.waitingBlock}>
                <Icon name="timer-sand" size={22} color={COLORS.textMuted} />
                <Text style={styles.waitingText}>
                  {escrowStatus === 'funded'    ? t('Waiting for Seller to dispatch goods...')
                   : escrowStatus === 'dispatched' ? t('Waiting for Buyer to confirm delivery...')
                   : escrowStatus === 'delivered'  ? t('Quality verification in progress. Funds releasing soon...')
                   : t('Processing...')}
                </Text>
              </View>
            )}

            <View style={styles.disputeContainer}>
              <TouchableOpacity
                style={[styles.disputeLink, !showRaiseDispute && styles.disputeLinkDisabled]}
                onPress={handleDispute}
                disabled={updatingEscrow || !showRaiseDispute}
              >
                <Icon name="alert-octagon-outline" size={16} color={showRaiseDispute ? COLORS.error : COLORS.textMuted} />
                <Text style={[styles.disputeLinkText, !showRaiseDispute && styles.disputeLinkTextDisabled]}>
                  {t('Report Quality Issue / Raise Debit Note')}
                </Text>
              </TouchableOpacity>
              {!showRaiseDispute && (
                <Text style={styles.disputeHelpText}>
                  {t('You will be able to raise a dispute or debit note once the shipment is dispatched.')}
                </Text>
              )}
            </View>
          </View>
        )}

        {isReleased && (
          <View style={styles.completedCard}>
            <Icon name="check-decagram" size={36} color={COLORS.success} />
            <Text style={styles.completedTitle}>{t('Deal Successfully Completed!')}</Text>
            <Text style={styles.completedDesc}>
              {t('Escrow payment of ₹{amount} released to seller.').replace('{amount}', Number(totalValue).toLocaleString('en-IN'))}
              {'\n'}{t('Contract closed on {date}.').replace('{date}', formatDate(deal?.releasedAt) || '—')}
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <DebitNoteBottomSheet 
        visible={showDebitNoteModal}
        onClose={() => setShowDebitNoteModal(false)}
        onSubmit={handleSubmitDebitNote}
        deal={deal}
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
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: w(10),
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: w(14),
    borderWidth: 1.5,
    borderColor: '#FEB2B2',
    marginBottom: h(14),
  },
  cancelledTitle: {
    fontSize: f(14),
    fontWeight: '800',
    color: '#742A2A',
    marginBottom: h(2),
  },
  cancelledDesc: {
    fontSize: f(12),
    color: '#C53030',
    lineHeight: h(16),
  },
  dealCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: h(4),
  },
  commodityTitle: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.text,
  },
  dealMeta: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  badge: {
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 6,
  },
  badgeText: {
    fontSize: f(10),
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F3F5',
    marginVertical: h(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(8),
  },
  label: {
    fontSize: f(12),
    color: COLORS.textLight,
  },
  value: {
    fontSize: f(12),
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: w(12),
  },
  boldValue: {
    fontWeight: '800',
  },
  flex1: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: f(14),
    fontWeight: '800',
    marginBottom: h(16),
  },
  docsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: h(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(10),
    flex: 1,
  },
  docTitle: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
  },
  docMeta: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginTop: h(1),
  },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderTopWidth: 3,
    borderTopColor: '#3182CE',
  },
  actionBlock: {
    gap: h(12),
    marginBottom: h(14),
  },
  actionDesc: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: w(10),
  },
  actionTitle: {
    fontSize: f(13.5),
    fontWeight: '800',
    color: COLORS.text,
  },
  actionSubtitle: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
    lineHeight: h(15),
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: h(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: w(8),
  },
  actionBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(13),
  },
  waitingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(10),
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: w(14),
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginVertical: h(10),
  },
  waitingText: {
    fontSize: f(12),
    color: COLORS.textLight,
    fontWeight: '600',
    flex: 1,
  },
  disputeContainer: {
    marginTop: h(8),
    borderTopWidth: 1,
    borderTopColor: '#ECEEF4',
    paddingTop: h(12),
  },
  disputeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
  },
  disputeLinkDisabled: {
    opacity: 0.65,
  },
  disputeLinkText: {
    fontSize: f(12),
    color: COLORS.error,
    fontWeight: '700',
  },
  disputeLinkTextDisabled: {
    color: COLORS.textMuted,
  },
  disputeHelpText: {
    fontSize: f(10.5),
    color: COLORS.textMuted,
    marginTop: h(4),
  },
  completedCard: {
    backgroundColor: '#F0FFF4',
    borderRadius: 16,
    padding: w(16),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C6F6D5',
    marginBottom: h(16),
    gap: h(8),
  },
  completedTitle: {
    fontSize: f(14.5),
    fontWeight: '800',
    color: '#22543D',
  },
  completedDesc: {
    fontSize: f(12),
    color: '#2F855A',
    textAlign: 'center',
    lineHeight: h(18),
  },
  bottomSpacer: {
    height: h(40),
  },
});
