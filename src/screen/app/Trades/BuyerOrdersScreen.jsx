import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import AppHeader from '../../../components/AppHeader';
import { SafeScreen } from '../../../components/SafeScreen';
import { showAlert } from '../../../components/CustomAlertBox';
import COLORS from '../../../constant/colors';
import { useTranslation } from '../../../hook/useTranslation';
import { selectSelectedRole, selectUser } from '../../../store/authSelectors';
import { w, h, f } from '../../../utils/responsive';
import { getBuyerPurchaseOrders } from '../../../service/trade/deal.service';
import { ORDER_STATUS } from '../../../service/trade/rfqWorkflow.service';

const ROLE_THEMES = {
  FPO:       { primary: COLORS.fpoPrimary,       light: COLORS.fpoLight },
  Trader:    { primary: COLORS.traderPrimary,    light: COLORS.traderLight },
  Miller:    { primary: COLORS.millerPrimary,    light: COLORS.millerLight },
  Corporate: { primary: COLORS.corporatePrimary, light: COLORS.corporateLight },
};

const BUYER_STATUS = {
  [ORDER_STATUS.PENDING_DISPATCH]: { label: 'Pending', progress: 0.2, icon: 'clock-outline' },
  [ORDER_STATUS.DISPATCHED]: { label: 'In Transit', progress: 0.55, icon: 'truck-delivery-outline' },
  [ORDER_STATUS.DELIVERED]: { label: 'Delivered', progress: 0.8, icon: 'package-check' },
  [ORDER_STATUS.COMPLETED]: { label: 'Completed', progress: 1, icon: 'check-decagram' },
};

export default function BuyerOrdersScreen({ navigation }) {
  const { t } = useTranslation();
  const user = useSelector(selectUser);
  const selectedRole = useSelector(selectSelectedRole) || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const list = await getBuyerPurchaseOrders();
      setOrders(Array.isArray(list) ? list : []);
    } catch (error) {
      showAlert({ type: 'error', title: t('Could Not Load Orders'), message: t(error?.message || 'Please try again.') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const renderOrder = ({ item }) => {
    const status = BUYER_STATUS[item.orderStatus] || BUYER_STATUS[ORDER_STATUS.PENDING_DISPATCH];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.title}>{item.commodity}</Text>
            <Text style={styles.subTitle}>{item.deliveryDetails?.location || '—'}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Icon name={status.icon} size={13} color={theme.primary} />
            <Text style={[styles.statusText, { color: theme.primary }]}>{t(status.label)}</Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <Info label={t('Approved Quantity')} value={`${item.approvedQuantity} ${item.deliveryDetails?.unit || 'Qt'}`} />
          <Info label={t('Final Price')} value={`₹${item.finalPrice}`} color={theme.primary} />
          <Info label={t('Delivery Date')} value={item.deliveryDetails?.deliveryDate || '—'} />
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${status.progress * 100}%`, backgroundColor: theme.primary }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>{t('Pending')}</Text>
          <Text style={styles.progressLabel}>{t('In Transit')}</Text>
          <Text style={styles.progressLabel}>{t('Delivered')}</Text>
          <Text style={styles.progressLabel}>{t('Completed')}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeScreen style={{ flex: 1, backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader backgroundColor={theme.primary} title={t('Buyer Orders')} subtitle={t('Track approved Purchase Orders')} showBackButton onBackPress={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} colors={[theme.primary]} />}
          renderItem={renderOrder}
          ListEmptyComponent={(
            <View style={styles.center}>
              <Icon name="truck-check-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{t('Approved Purchase Orders will appear here.')}</Text>
            </View>
          )}
        />
      )}
    </SafeScreen>
  );
}

function Info({ label, value, color = '#0F172A' }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: w(16), paddingBottom: h(30) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: w(20), gap: h(8) },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: w(14), marginBottom: h(12), borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: h(12) },
  title: { color: '#0F172A', fontWeight: '800', fontSize: f(15) },
  subTitle: { color: '#64748B', fontSize: f(11), marginTop: h(3) },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: w(4), backgroundColor: '#F8FAFC', paddingHorizontal: w(8), paddingVertical: h(5), borderRadius: 8 },
  statusText: { fontWeight: '800', fontSize: f(11) },
  metricRow: { flexDirection: 'row', gap: w(8), marginBottom: h(14) },
  metric: { flex: 1 },
  metricLabel: { color: '#64748B', fontSize: f(10), fontWeight: '700', marginBottom: h(3) },
  metricValue: { fontSize: f(13), fontWeight: '800' },
  progressTrack: { height: h(7), borderRadius: 999, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 999 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: h(7) },
  progressLabel: { color: '#64748B', fontSize: f(9), fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: f(13), textAlign: 'center' },
});
