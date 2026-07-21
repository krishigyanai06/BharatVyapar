import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../../theme/colors';
import { w, h, f } from '../../../shared/utils/responsive';
import {
  normalizeStatus,
  BUY_TAB_FILTERS,
  SELL_TAB_FILTERS,
} from '../procurement.rules';

export default function TradeTabHeader({
  tradeMode,
  changeTradeMode,
  activeTab,
  changeTab,
  selectedCrop,
  changeCrop,
  cropChips,
  uniqueOffers,
  selectedRole,
  setShowTooltip,
  theme,
  t,
}) {
  const tabFilters = tradeMode === 'buy' ? BUY_TAB_FILTERS : SELL_TAB_FILTERS;

  return (
    <View>
      {/* Switcher Guide Text */}
      <View style={styles.switcherGuideRow}>
        <Text style={[styles.switcherGuideText, { color: theme.primary }]}>
          {t('Choose your activity')}
        </Text>
      </View>

      <View style={styles.switcherContainer}>
        <TouchableOpacity
          style={[
            styles.switcherBtn,
            tradeMode === 'buy' && {
              borderBottomWidth: 3,
              borderBottomColor: theme.primary,
            },
          ]}
          onPress={() => changeTradeMode('buy')}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('My Bids & Quotes')}
          accessibilityState={{ selected: tradeMode === 'buy' }}
        >
          <Text style={[
            styles.switcherText,
            tradeMode === 'buy' ? { color: theme.primary, fontWeight: '800' } : { color: '#64748B' }
          ]}>
            {t('My Bids & Quotes')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switcherBtn,
            tradeMode === 'sell' && {
              borderBottomWidth: 3,
              borderBottomColor: theme.primary,
            },
          ]}
          onPress={() => changeTradeMode('sell')}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('My Listings')}
          accessibilityState={{ selected: tradeMode === 'sell' }}
          accessibleState={{ selected: tradeMode === 'sell' }}
        >
          <Text style={[
            styles.switcherText,
            tradeMode === 'sell' ? { color: theme.primary, fontWeight: '800' } : { color: '#64748B' }
          ]}>
            {t('My Listings')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section label — status tab filters */}
      <View style={styles.filterLabelRow}>
        <View style={[styles.filterLabelLine, { backgroundColor: theme.primary + '25' }]} />
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => setShowTooltip(true)}
          activeOpacity={0.75}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('Show status filter guide')}
        >
          <Text style={[styles.filterLabelText, { color: theme.primary }]}>
            {t('Filter by Status')}
          </Text>
          <Icon name="information-outline" size={13.5} color={theme.primary} style={{ marginLeft: w(4) }} />
        </TouchableOpacity>
        <View style={[styles.filterLabelLine, { backgroundColor: theme.primary + '25' }]} />
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent} keyboardShouldPersistTaps="handled">
          {tabFilters.map(tab => {
            const isSelected = tab === activeTab;
            const inNegBadge = tradeMode === 'buy' && tab === 'In Negotiation' &&
              uniqueOffers.some(o => ['in_negotiation', 'negotiating', 'countered'].includes(normalizeStatus(o.displayStatus || o.status)) && o.currentTurn === (selectedRole === 'FPO' ? 'buyer' : 'seller'));
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabChip,
                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                  inNegBadge && { flexDirection: 'row', alignItems: 'center', gap: w(4) }
                ]}
                onPress={() => changeTab(tab)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t(tab)}
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.tabChipText, isSelected && { color: COLORS.white, fontWeight: '800' }]}>
                  {t(tab)}
                </Text>
                {inNegBadge && (
                  <View style={styles.urgentDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Crop Filter Chips */}
      {cropChips.length > 1 && (
        <>
          <View style={styles.filterLabelRow}>
            <View style={[styles.filterLabelLine, { backgroundColor: theme.primary + '25' }]} />
            <Text style={[styles.filterLabelText, { color: theme.primary }]}>
              {t('Filter by Crop / Commodity')}
            </Text>
            <View style={[styles.filterLabelLine, { backgroundColor: theme.primary + '25' }]} />
          </View>
          <View style={styles.cropChipsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cropChipsContent}
              keyboardShouldPersistTaps="handled"
            >
              {cropChips.map(crop => {
                const isSelected = crop === selectedCrop;
                return (
                  <TouchableOpacity
                    key={crop}
                    style={[
                      styles.cropChip,
                      isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => changeCrop(crop)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t('Filter by crop {crop}').replace('{crop}', crop)}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[
                      styles.cropChipText,
                      isSelected && { color: COLORS.white, fontWeight: '700' }
                    ]}>
                      {crop === 'All' ? t('All') : crop}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  switcherGuideRow: {
    paddingHorizontal: w(16),
    marginTop: h(12),
    marginBottom: h(4),
  },
  switcherGuideText: {
    fontSize: f(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: w(16),
    borderBottomWidth: 1.5,
    borderBottomColor: '#ECEEF4',
  },
  switcherBtn: {
    flex: 1,
    paddingVertical: h(14),
    alignItems: 'center',
  },
  switcherText: {
    fontSize: f(13.5),
    fontWeight: '700',
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: w(16),
    marginTop: h(14),
    marginBottom: h(6),
  },
  filterLabelLine: {
    flex: 1,
    height: 1.2,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: w(10),
  },
  filterLabelText: {
    fontSize: f(10.5),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabBar: {
    backgroundColor: '#FAFBFF',
    paddingVertical: h(10),
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF4',
  },
  tabBarContent: {
    paddingHorizontal: w(16),
    gap: w(8),
  },
  tabChip: {
    paddingHorizontal: w(18),
    paddingVertical: h(8),
    borderRadius: 22,
    backgroundColor: '#EEF2F7',
    borderWidth: 1.5,
    borderColor: '#D8DFEA',
  },
  tabChipText: {
    fontSize: f(12.5),
    fontWeight: '700',
    color: '#4A5568',
  },
  urgentDot: {
    width: w(6),
    height: w(6),
    borderRadius: w(3),
    backgroundColor: '#E53E3E',
  },
  cropChipsBar: {
    backgroundColor: '#FAFBFF',
    paddingVertical: h(8),
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF4',
  },
  cropChipsContent: {
    paddingHorizontal: w(16),
    gap: w(8),
  },
  cropChip: {
    paddingHorizontal: w(14),
    paddingVertical: h(6),
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cropChipText: {
    fontSize: f(11.5),
    color: '#475569',
    fontWeight: '600',
  },
});
