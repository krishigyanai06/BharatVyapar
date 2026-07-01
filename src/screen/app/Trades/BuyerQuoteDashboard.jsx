import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import AppHeader from '../../../components/AppHeader';
import { SafeScreen } from '../../../components/SafeScreen';
import { showAlert } from '../../../components/CustomAlertBox';
import COLORS from '../../../constant/colors';
import { useTranslation } from '../../../hook/useTranslation';
import { selectSelectedRole, selectUser } from '../../../store/authSelectors';
import { w, h, f } from '../../../utils/responsive';
import {
  acceptRequirementQuote,
  getReceivedQuotesOnRequirements,
  rejectRequirementQuote,
} from '../../../service/trade/deal.service';

const ROLE_THEMES = {
  FPO:       { primary: COLORS.fpoPrimary,       light: COLORS.fpoLight },
  Trader:    { primary: COLORS.traderPrimary,    light: COLORS.traderLight },
  Miller:    { primary: COLORS.millerPrimary,    light: COLORS.millerLight },
  Corporate: { primary: COLORS.corporatePrimary, light: COLORS.corporateLight },
};

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
      loadQuotes(true);
    } catch (error) {
      showAlert({ type: 'error', title: t('Accept Failed'), message: t(error?.message || 'Please try again.') });
    }
  }, [loadQuotes, t]);

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
    const sellerName = item.sellerName || item.sellerId?.shopName || item.sellerId?.firstName || t('Seller');
    const isPending = String(item.status || '').toLowerCase() === 'pending';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sellerName}>{sellerName}</Text>
            <View style={styles.ratingRow}>
              <Icon name="star" size={13} color="#D69E2E" />
              <Text style={styles.ratingText}>{item.sellerRating || item.sellerId?.rating || '—'}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status || 'Pending'}</Text>
          </View>
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
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t('Dispatch Time')}</Text>
            <Text style={styles.metricValue}>{item.dispatchTime || '—'}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => showAlert({ type: 'info', title: t('Seller Profile'), message: sellerName })}>
            <Icon name="account-eye-outline" size={16} color={theme.primary} />
            <Text style={[styles.profileText, { color: theme.primary }]}>{t('View Seller Profile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectBtn, !isPending && styles.disabledBtn]}
            onPress={() => isPending && handleReject(item)}
            disabled={!isPending}
          >
            <Text style={styles.rejectText}>{t('Reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: isPending ? theme.primary : '#CBD5E1' }]}
            onPress={() => isPending && handleAccept(item)}
            disabled={!isPending}
          >
            <Text style={styles.acceptText}>{t('Accept Quote')}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: w(14), marginBottom: h(12), borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: h(12) },
  sellerName: { fontSize: f(15), fontWeight: '800', color: '#0F172A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: w(4), marginTop: h(4) },
  ratingText: { fontSize: f(12), color: '#64748B', fontWeight: '700' },
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
