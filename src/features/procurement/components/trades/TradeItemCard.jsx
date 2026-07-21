import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../../../theme/colors';
import { w, h, f } from '../../../../shared/utils/responsive';
import { showAlert } from '../../../../shared/components/CustomAlertBox';
import {
  normalizeStatus,
  OFFER_STATUS_CONFIG,
  LISTING_STATUS_CONFIG,
  formatExpiry,
  formatRelative,
} from '../../procurement.rules';

export default function TradeItemCard({
  item,
  theme,
  selectedRole,
  handleOfferPress,
  navigation,
  t,
  dispatchSetModalOffer,
}) {
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

    const crop = listing.commodityName || '—';
    const variety = listing.type || null;
    const quantity = `${listing.quantity ?? '?'} ${listing.unit || ''}`.trim();
    const price = listing.sellingPrice != null ? String(listing.sellingPrice) : 'N/A';
    const priceUnit = listing.sellingPriceUnit || 'Qt';
    const location = listing.commodityLocation || '—';
    
    const handlePress = () => {
      if (isSold) {
        navigation.navigate('DealDetails', {
          dealId: listing._dealId || listing.dealId || listing.deal?._id || listing.deal?.id,
          item: { id, commodityName: crop, type: variety, ...listing },
          role: 'seller',
        });
      } else {
        dispatchSetModalOffer(listing);
      }
    };

    return (
      <TouchableOpacity
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
}

const styles = StyleSheet.create({
  compactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginVertical: h(6),
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactUrgentStrip: {
    paddingHorizontal: w(12),
    paddingVertical: h(4.5),
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactUrgentText: {
    color: COLORS.white,
    fontSize: f(10),
    fontWeight: '800',
  },
  compactCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: w(14),
    paddingVertical: h(12),
  },
  compactCardLeft: {
    flex: 1,
    gap: h(4),
  },
  compactCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
  },
  compactCropTitle: {
    fontSize: f(14),
    fontWeight: '800',
    color: '#1A202C',
  },
  compactLocationText: {
    fontSize: f(11),
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  compactBidDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(14),
  },
  compactBidLabel: {
    fontSize: f(12),
    color: '#4A5568',
    fontWeight: '500',
  },
  compactBidValue: {
    fontWeight: '700',
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(12),
    marginTop: h(2),
  },
  compactMetaText: {
    fontSize: f(10.5),
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  compactCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
  },
  compactStatusPill: {
    borderRadius: 8,
    paddingHorizontal: w(10),
    paddingVertical: h(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatusPillText: {
    fontSize: f(11),
    fontWeight: '800',
  },
});
