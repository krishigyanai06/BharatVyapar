import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import { w, h, f } from '../../../shared/utils/responsive';
import ReceivedOffersModal from '../../marketplace/components/ReceivedOffersModal';
import StatusFilterTooltip from '../components/StatusFilterTooltip';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useTradesScreen } from '../hooks/useTradesScreen';

// Sub-components
import TradeTabHeader from '../components/TradeTabHeader';
import TradeItemCard from '../components/TradeItemCard';

export default function TradesScreen({ navigation, route }) {
  const { t } = useTranslation();
  const hook = useTradesScreen({ navigation, route });
  const {
    selectedRole,
    theme,
    tradeMode,
    activeTab,
    selectedCrop,
    loading,
    refreshing,
    apiError,
    backendCrash,
    selectedOfferForModal,
    showTooltip,
    setShowTooltip,
    groupedListData,
    cropChips,
    uniqueOffers,
    filteredOffers,
    filteredSellListings,
    handleRefresh,
    handleOfferPress,
    toggleSection,
    changeTradeMode,
    changeTab,
    changeCrop,
    setModalOffer,
  } = hook;

  const handleSetModalOffer = useCallback((offer) => {
    setModalOffer(offer);
  }, [setModalOffer]);

  const renderItem = useCallback(({ item, index }) => {
    if (item.type === 'section_header') {
      const { sectionKey, label, icon, accentColor, count, isExpanded } = item;
      return (
        <TouchableOpacity
          key={`header-${sectionKey}`}
          style={[styles.sectionAccordionHeader, { borderColor: accentColor + '30' }]}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.8}
        >
          <View style={styles.sectionAccordionLeft}>
            <View style={[styles.sectionIconBg, { backgroundColor: accentColor + '12' }]}>
              <Icon name={icon} size={16} color={accentColor} />
            </View>
            <Text style={[styles.sectionAccordionTitle, { color: '#1A202C' }]}>
              {t(label)}
            </Text>
          </View>
          <View style={styles.sectionAccordionRight}>
            <View style={[styles.sectionCountBadgeCompact, { backgroundColor: accentColor + '18' }]}>
              <Text style={[styles.sectionCountTextCompact, { color: accentColor }]}>{count}</Text>
            </View>
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#718096"
              style={{ marginLeft: w(4) }}
            />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TradeItemCard
        item={item}
        theme={theme}
        selectedRole={selectedRole}
        handleOfferPress={handleOfferPress}
        navigation={navigation}
        t={t}
        dispatchSetModalOffer={handleSetModalOffer}
      />
    );
  }, [theme, selectedRole, handleOfferPress, navigation, t, toggleSection, handleSetModalOffer]);

  const listHeader = useMemo(() => {
    return (
      <View>
        {apiError && (
          <View style={[styles.errorBanner, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '25', borderBottomWidth: 1.5 }]}>
            <Icon name="information-outline" size={15} color={theme.primary} />
            <Text style={[styles.errorBannerText, { color: theme.primary, fontWeight: '600' }]}>{t(apiError)}</Text>
            <TouchableOpacity onPress={() => hook.loadData(true)} style={[styles.retryBadge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.retryBadgeText, { color: COLORS.white }]}>{t('Retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TradeTabHeader
          tradeMode={tradeMode}
          changeTradeMode={changeTradeMode}
          activeTab={activeTab}
          changeTab={changeTab}
          selectedCrop={selectedCrop}
          changeCrop={changeCrop}
          cropChips={cropChips}
          uniqueOffers={uniqueOffers}
          selectedRole={selectedRole}
          setShowTooltip={setShowTooltip}
          theme={theme}
          t={t}
        />
      </View>
    );
  }, [apiError, tradeMode, activeTab, selectedCrop, cropChips, uniqueOffers, selectedRole, theme, hook, t, changeTradeMode, changeTab, changeCrop, setShowTooltip]);

  const listEmpty = useMemo(() => {
    if (apiError) return null;
    if (tradeMode === 'buy') {
      if (filteredOffers.length > 0) return null;
      return (
        <View style={styles.emptyState}>
          {backendCrash ? (
            <>
              <Icon name="package-variant-closed-remove" size={80} color="#E53E3E" style={{ opacity: 0.8 }} />
              <Text style={styles.emptyTitle}>{t('Listings Removed')}</Text>
              <Text style={styles.emptyText}>
                {t('The seller has permanently removed this commodity from the marketplace.')}
              </Text>
            </>
          ) : (
            <>
              <Icon name="handshake-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{t('No Offers Found')}</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'All'
                  ? t("You haven't submitted any offers yet.\nBrowse the marketplace to find commodities.")
                  : t('No offers with "{status}" status.').replace('{status}', activeTab)}
              </Text>
            </>
          )}
          {activeTab === 'All' && !backendCrash && (
            <Text style={[styles.emptySubHint, { color: theme.primary }]}>
              {t('Go to Market tab to place offers on listings.')}
            </Text>
          )}
        </View>
      );
    } else {
      if (filteredSellListings.length > 0) return null;
      return (
        <View style={styles.emptyState}>
          <Icon name="store-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'Sold' ? t('No Sold Deals Yet') :
             activeTab === 'In Negotiation' ? t('No Active Negotiations') :
             activeTab === 'Closed' ? t('No Closed Deals') :
             t('No Listings Found')}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'All' || activeTab === 'Active'
              ? t("You haven't listed any crops for sale in the marketplace yet.")
              : t('No listings with this status right now.')}
          </Text>
          {(activeTab === 'All' || activeTab === 'Active') && (
            <Text style={[styles.emptySubHint, { color: theme.primary }]}>
              {t('Use the Sell tab at the bottom to create a new listing.')}
            </Text>
          )}
        </View>
      );
    }
  }, [apiError, tradeMode, filteredOffers.length, filteredSellListings.length, backendCrash, activeTab, theme.primary, t]);

  const keyExtractor = useCallback((item, index) => {
    if (item.type === 'section_header') {
      return `header-${item.sectionKey}`;
    }
    const inner = item.item || {};
    return `${item.type}-${inner.id || inner._id || index}`;
  }, []);

  if (loading) {
    return (
      <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
        <AppHeader
          backgroundColor={theme.primary}
          title={t('My Trades')}
          subtitle={t('Your offers, negotiations & deals')}
          showBackButton={false}
        />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{t('Loading your trades...')}</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title={t('My Trades')}
        subtitle={t('Your offers, negotiations & deals')}
        showBackButton={false}
      />

      <FlatList
        data={groupedListData}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        renderItem={renderItem}
      />

      <ReceivedOffersModal
        visible={!!selectedOfferForModal}
        onClose={() => setModalOffer(null)}
        item={selectedOfferForModal}
      />

      <StatusFilterTooltip
        visible={showTooltip}
        onClose={() => setShowTooltip(false)}
        theme={theme}
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
  errorBanner: {
    paddingVertical: h(8),
    paddingHorizontal: w(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
  },
  errorBannerText: {
    fontSize: f(12),
    flex: 1,
  },
  retryBadge: {
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 4,
  },
  retryBadgeText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  listContent: {
    padding: w(16),
    paddingBottom: h(30),
  },
  sectionAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: h(12),
    paddingHorizontal: w(14),
    borderRadius: 12,
    borderWidth: 1.2,
    backgroundColor: COLORS.white,
    marginTop: h(12),
    marginBottom: h(4),
  },
  sectionAccordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconBg: {
    width: w(28),
    height: w(28),
    borderRadius: w(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: w(10),
  },
  sectionAccordionTitle: {
    fontSize: f(13),
    fontWeight: '800',
  },
  sectionAccordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCountBadgeCompact: {
    borderRadius: 10,
    paddingHorizontal: w(8),
    paddingVertical: h(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountTextCompact: {
    fontSize: f(11),
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: h(60),
    gap: h(8),
  },
  emptyTitle: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: f(12),
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: h(18),
    paddingHorizontal: w(20),
  },
  emptySubHint: {
    fontSize: f(12),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: h(4),
    paddingHorizontal: w(20),
  },
});
