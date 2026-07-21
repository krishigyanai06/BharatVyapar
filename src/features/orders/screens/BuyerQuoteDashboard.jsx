import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import AppHeader from '../../../shared/components/AppHeader';
import { SafeScreen } from '../../../shared/components/SafeScreen';
import { showAlert } from '../../../shared/components/CustomAlertBox';

import COLORS from '../../../theme/colors';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { selectSelectedRole, selectUser } from '../../../store/authSelectors';
import { w, h, f } from '../../../shared/utils/responsive';
import {
  acceptRequirementQuote,
  getReceivedQuotesOnRequirements,
  rejectRequirementQuote,
} from '../orders.service';
import { getSafeUserName } from '../../../shared/utils/formatters';
import StatusPill from '../../../shared/components/StatusPill';
import { ROLE_THEMES } from '../../../theme/roleThemes';

export default function BuyerQuoteDashboard({ navigation, route }) {
  const { t } = useTranslation();
  const user = useSelector(selectUser);
  const selectedRole = useSelector(selectSelectedRole) || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;
  const requirement = useMemo(() => route?.params?.requirement || {}, [route?.params?.requirement]);
  const requirementId = requirement.id || requirement._id;

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadQuotes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const list = await getReceivedQuotesOnRequirements(user?.id || user?._id, { requirementId });
      setQuotes(Array.isArray(list) ? list : []);
    } catch (error) {
      showAlert({ type: 'error', title: t('Could Not Load Quotes'), message: t(error?.message || 'Please try again.') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requirementId, user?.id, user?._id, t]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const summary = useMemo(() => {
    const unit = requirement.unit || 'Qt';
    return `${requirement.commodity || t('Requirement')} • ${requirement.remainingQuantity ?? requirement.quantity ?? 0} ${unit} ${t('remaining')}`;
  }, [requirement, t]);

  const handleNegotiatePress = useCallback((quote) => {
    navigation.navigate('NegotiationDetails', {
      offerId: quote.id || quote._id,
      offer: { id: quote.id || quote._id, ...quote },
      item: requirement,
      role: 'buyer',
    });
  }, [navigation, requirement]);

  const handleAccept = useCallback(async (quote) => {
    try {
      const response = await acceptRequirementQuote(quote.id || quote._id);
      const status = response?.data?.requirement?.status;
      const remaining = response?.data?.requirement?.remainingQuantity;
      showAlert({
        type: 'success',
        title: t('Quote Accepted'),
        message: t('Purchase Order generated. Requirement status: {status}, remaining quantity: {remaining}.')
          .replace('{status}', status || '')
          .replace('{remaining}', String(remaining ?? 0)),
      });
      navigation.navigate('BuyerOrders');
    } catch (error) {
      showAlert({ type: 'error', title: t('Accept Failed'), message: t(error?.message || 'Please try again.') });
    }
  }, [navigation, t]);

  const handleReject = useCallback(async (quote) => {
    try {
      await rejectRequirementQuote(quote.id || quote._id);
      showAlert({ type: 'success', title: t('Quote Rejected'), message: t('Seller has been notified.') });
      loadQuotes(true);
    } catch (error) {
      showAlert({ type: 'error', title: t('Reject Failed'), message: t(error?.message || 'Please try again.') });
    }
  }, [loadQuotes, t]);

  const renderQuote = ({ item }) => {
    const sellerObj = item.sellerId || item.userId || item.seller || {};
    let sellerName = typeof sellerObj === 'object'
      ? (item.sellerName || sellerObj.shopName || sellerObj.shopname || [sellerObj.firstName, sellerObj.lastName].filter(Boolean).join(' ') || t('Seller'))
      : (item.sellerName || String(sellerObj) || t('Seller'));
      
    // Fallback to tokenized role if the backend returns an ID instead of a name
    if (/^[a-fA-F0-9]{24}$/.test(sellerName)) {
      const sellerIdForFallback = typeof sellerObj === 'string' ? sellerObj : (sellerObj._id || sellerObj.id || item.sellerId || '');
      sellerName = getSafeUserName(sellerIdForFallback, t('Seller'));
    }
    
    const isPending = String(item.status || '').toLowerCase() === 'pending';
    
    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: theme.primary + '35' }]}
        activeOpacity={0.9}
        onPress={() => handleNegotiatePress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName}>{sellerName}</Text>
            {(() => {
              const rating = typeof sellerObj === 'object' ? (item.sellerRating || sellerObj.rating) : null;
              return rating ? (
                <View style={styles.ratingRow}>
                  <Icon name="star" size={13} color="#D69E2E" />
                  <Text style={styles.ratingText}>{rating}</Text>
                </View>
              ) : (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{t('New')}</Text>
                </View>
              );
            })()}
          </View>
          <StatusPill status={item.status || 'Pending'} />
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t('Offered Quantity')}</Text>
            <Text style={styles.metricValue}>{item.offeredQuantity || item.quantity} {item.priceUnit || requirement.unit || 'Qt'}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t('Quote Price')}</Text>
            <Text style={[styles.metricValue, { color: theme.primary }]}>₹{item.quotePrice || item.price}</Text>
          </View>
          {item.dispatchTime ? (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>{t('Dispatch Time')}</Text>
              <Text style={styles.metricValue}>{item.dispatchTime}</Text>
            </View>
          ) : (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>{t('Dispatch Time')}</Text>
              <Text style={[styles.metricValue, styles.notSetText]}>{t('Not Set')}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => showAlert({ type: 'info', title: t('Seller Profile'), message: sellerName })}>
            <Icon name="account-eye-outline" size={16} color={theme.primary} />
            <Text style={[styles.profileText, { color: theme.primary }]}>{t('View Seller Profile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
            onPress={() => handleNegotiatePress(item)}
          >
            <Text style={styles.acceptText}>{isPending ? t('Negotiate / Counter') : t('View Details')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeScreen style={{ flex: 1, backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader backgroundColor={theme.primary} title={t('Buyer Quote Dashboard')} subtitle={summary} showBackButton onBackPress={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loadingText}>{t('Loading quotes...')}</Text>
        </View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadQuotes(true)} colors={[theme.primary]} />}
          renderItem={renderQuote}
          ListEmptyComponent={(
            <View style={styles.center}>
              <Icon name="file-search-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{t('No Quotes Yet')}</Text>
              <Text style={styles.emptyText}>{t('Submitted seller quotes will appear here.')}</Text>
            </View>
          )}
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: w(16), paddingBottom: h(30) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: w(20), gap: h(8) },
  loadingText: { color: COLORS.textMuted, fontSize: f(13) },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(14),
    marginBottom: h(12),
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: h(12) },
  sellerName: { fontSize: f(15), fontWeight: '800', color: '#0F172A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: w(4), marginTop: h(4) },
  ratingText: { fontSize: f(12), color: '#64748B', fontWeight: '700' },
  newBadge: { marginTop: h(4), alignSelf: 'flex-start', backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: w(6), paddingVertical: h(2) },
  newBadgeText: { fontSize: f(10), color: '#065F46', fontWeight: '800' },
  notSetText: { color: '#94A3B8', fontStyle: 'italic', fontSize: f(12) },
  statusBadge: { backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: w(8), paddingVertical: h(4) },
  statusText: { color: '#475569', fontWeight: '800', fontSize: f(11) },
  metricRow: { flexDirection: 'row', gap: w(8), marginBottom: h(12) },
  metric: { flex: 1 },
  metricLabel: { fontSize: f(10), color: '#64748B', fontWeight: '700', marginBottom: h(3) },
  metricValue: { fontSize: f(13), color: '#0F172A', fontWeight: '800' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: w(8), flexWrap: 'wrap' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: w(5), paddingVertical: h(8), marginRight: 'auto' },
  profileText: { fontSize: f(11), fontWeight: '800' },
  rejectBtn: { borderWidth: 1, borderColor: '#FEB2B2', borderRadius: 8, paddingHorizontal: w(12), paddingVertical: h(8) },
  rejectText: { color: '#E53E3E', fontSize: f(11), fontWeight: '800' },
  disabledBtn: { opacity: 0.5 },
  acceptBtn: { borderRadius: 8, paddingHorizontal: w(12), paddingVertical: h(9) },
  acceptText: { color: COLORS.white, fontSize: f(11), fontWeight: '800' },
  emptyTitle: { color: COLORS.text, fontSize: f(16), fontWeight: '800' },
  emptyText: { color: COLORS.textMuted, fontSize: f(12), textAlign: 'center' },
});
