import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../../../theme/colors';

/**
 * NegotiationTimelineList
 * Renders negotiation history timeline rounds cleanly.
 */
export function NegotiationTimelineList({
  rounds = [],
  myRole = 'buyer',
  theme,
  t,
  historyOpen = true,
  onToggleHistory,
}) {
  if (!rounds || rounds.length === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerRow}
        activeOpacity={0.7}
        onPress={onToggleHistory}
      >
        <View style={styles.headerLeft}>
          <Icon name="history" size={18} color={theme?.primary || COLORS.primary} />
          <Text style={[styles.headerTitle, { color: theme?.primary || COLORS.primary }]}>
            {t('Negotiation History')} ({rounds.length})
          </Text>
        </View>
        <Icon
          name={historyOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#718096"
        />
      </TouchableOpacity>

      {historyOpen && (
        <View style={styles.timelineList}>
          {rounds.map((item, index) => {
            const isMe = item.proposedBy === myRole || item.role === myRole;
            const price = item.price ?? item.counterPrice ?? 0;
            const quantity = item.quantity ?? item.counterQty ?? 0;

            return (
              <View key={item.id || item._id || index} style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.roleBadge,
                        isMe ? { backgroundColor: '#EBF8FF' } : { backgroundColor: '#F0FFF4' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          isMe ? { color: '#3182CE' } : { color: '#38A169' },
                        ]}
                      >
                        {isMe ? t('Your Offer') : t('Counter Offer')}
                      </Text>
                    </View>

                    {item.isFinal ? (
                      <View style={styles.finalTag}>
                        <Text style={styles.finalTagText}>{t('FINAL')}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.roundNumber}>
                    #{index + 1}
                  </Text>
                </View>

                <View style={styles.roundDetails}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>{t('Price')}</Text>
                    <Text style={styles.detailValue}>\u20B9{Number(price).toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>{t('Quantity')}</Text>
                    <Text style={styles.detailValue}>{quantity} Qt</Text>
                  </View>
                </View>

                {item.remarks ? (
                  <Text style={styles.remarksText}>
                    "{item.remarks}"
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  timelineList: {
    marginTop: 12,
    gap: 10,
  },
  roundCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E0',
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  finalTag: {
    backgroundColor: '#E53E3E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  finalTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roundNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  roundDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  detailCol: {},
  detailLabel: {
    fontSize: 10,
    color: '#718096',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
  },
  remarksText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#4A5568',
    marginTop: 6,
  },
});
