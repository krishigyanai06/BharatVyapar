import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../../theme/colors';
import { safeText, safePrice } from '../../../shared/utils/formatters';

/**
 * NegotiationHeaderCard
 * Presentational Header Metric Card for Negotiation Details
 */
export function NegotiationHeaderCard({
  item,
  offer,
  statusConfig,
  theme,
  t,
  isMyTurn,
  isClosed,
}) {
  const cropTitle = safeText(
    item?.commodityName || item?.commodity || offer?.commodityName || offer?.cropName,
    'Commodity'
  );

  const rawStatus = (offer?.status || 'pending').toLowerCase();
  const statusInfo = statusConfig[rawStatus] || statusConfig.pending;

  const currentPrice = offer?.price ?? item?.price ?? 0;
  const currentQuantity = offer?.quantity ?? item?.quantity ?? 0;

  return (
    <View style={styles.card}>
      {/* Top Title & Status */}
      <View style={styles.topRow}>
        <View style={styles.titleWrapper}>
          <Text style={styles.cropTitle} numberOfLines={1}>
            {cropTitle}
          </Text>
          <Text style={styles.locationSub}>
            {safeText(item?.location || item?.deliveryLocation, 'Location N/A')}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
            {t(statusInfo.label)}
          </Text>
        </View>
      </View>

      {/* Metric Breakdown */}
      <View style={styles.metricGrid}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>{t('Current Price')}</Text>
          <Text style={[styles.metricValue, { color: theme?.primary || COLORS.primary }]}>
            \u20B9{Number(currentPrice).toLocaleString('en-IN')}
            <Text style={styles.unitText}>/Qt</Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>{t('Quantity')}</Text>
          <Text style={styles.metricValue}>
            {Number(currentQuantity).toLocaleString('en-IN')}
            <Text style={styles.unitText}> Qt</Text>
          </Text>
        </View>
      </View>

      {/* Turn Indicator Banner */}
      {!isClosed ? (
        <View
          style={[
            styles.turnBanner,
            isMyTurn ? { backgroundColor: '#EBF8FF' } : { backgroundColor: '#F7FAFC' },
          ]}
        >
          <Icon
            name={isMyTurn ? 'account-clock' : 'timer-sand'}
            size={18}
            color={isMyTurn ? '#3182CE' : '#718096'}
          />
          <Text
            style={[
              styles.turnBannerText,
              isMyTurn ? { color: '#2B6CB0', fontWeight: '700' } : { color: '#4A5568' },
            ]}
          >
            {isMyTurn ? t('Action Needed: Your Turn to Respond') : t('Waiting for Other Party Response')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWrapper: {
    flex: 1,
    paddingRight: 10,
  },
  cropTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  locationSub: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#718096',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  turnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  turnBannerText: {
    fontSize: 13,
  },
});
