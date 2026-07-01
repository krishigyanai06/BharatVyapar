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
import { getSellerPurchaseOrders, updatePurchaseOrderStatus } from '../../../service/trade/deal.service';
import { ORDER_STATUS } from '../../../service/trade/rfqWorkflow.service';

const ROLE_THEMES = {
  FPO:       { primary: COLORS.fpoPrimary,       light: COLORS.fpoLight },
  Trader:    { primary: COLORS.traderPrimary,    light: COLORS.traderLight },
  Miller:    { primary: COLORS.millerPrimary,    light: COLORS.millerLight },
  Corporate: { primary: COLORS.corporatePrimary, light: COLORS.corporateLight },
};

const NEXT_STATUS = {
  [ORDER_STATUS.PENDING_DISPATCH]: ORDER_STATUS.DISPATCHED,
  [ORDER_STATUS.DISPATCHED]: ORDER_STATUS.DELIVERED,
  [ORDER_STATUS.DELIVERED]: ORDER_STATUS.COMPLETED,
};

export default function SellerOrdersScreen({ navigation }) {
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
      const list = await getSellerPurchaseOrders();
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

  const moveNext = useCallback(async (order) => {
    const nextStatus = NEXT_STATUS[order.orderStatus];
    if (!nextStatus) return;
    try {
      await updatePurchaseOrderStatus(order.id || order._id, nextStatus);
      showAlert({ type: 'success', title: t('Order Updated'), message: t('Order status moved to {status}.').replace('{status}', nextStatus) });
      loadOrders(true);
    } catch (error) {
      showAlert({ type: 'error', title: t('Update Failed'), message: t(error?.message || 'Please try again.') });
    }
  }, [loadOrders, t]);

  const renderOrder = ({ item }) => {
    const nextStatus = NEXT_STATUS[item.orderStatus];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.commodity}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.orderStatus}</Text>
          </View>
        </View>
        <View style={styles.metricRow}>
          <Info label={t('Approved Quantity')} value={`${item.approvedQuantity} ${item.deliveryDetails?.unit || 'Qt'}`} />
          <Info label={t('Final Price')} value={`₹${item.finalPrice}`} color={theme.primary} />
          <Info label={t('Delivery')} value={item.deliveryDetails?.location || '—'} />
        </View>
        {nextStatus ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={() => moveNext(item)}>
            <Icon name="arrow-right-circle-outline" size={16} color={COLORS.white} />
            <Text style={styles.primaryText}>{t('Mark {status}').replace('{status}', nextStatus)}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completedRow}>
            <Icon name="check-decagram" size={16} color="#38A169" />
            <Text style={styles.completedText}>{t('Completed')}</Text>
          </View>
        )}
      </View>
    );
  };

  const subtitle = useMemo(() => t('Accepted purchase orders only'), [t]);

  return (
    <SafeScreen style={{ flex: 1, backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader backgroundColor={theme.primary} title={t('Seller Orders')} subtitle={subtitle} showBackButton onBackPress={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} colors={[theme.primary]} />}
          renderItem={renderOrder}
          ListEmptyComponent={<Empty text={t('Accepted Purchase Orders will appear here.')} />}
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

function Empty({ text }) {
  return (
    <View style={styles.center}>
      <Icon name="clipboard-text-outline" size={52} color={COLORS.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: w(16), paddingBottom: h(30) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: w(20), gap: h(8) },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: w(14), marginBottom: h(12), borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: h(12) },
  title: { color: '#0F172A', fontWeight: '800', fontSize: f(15) },
  statusBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: w(8), paddingVertical: h(4), borderRadius: 8 },
  statusText: { color: '#475569', fontWeight: '800', fontSize: f(11) },
  metricRow: { flexDirection: 'row', gap: w(8), marginBottom: h(12) },
  metric: { flex: 1 },
  metricLabel: { color: '#64748B', fontSize: f(10), fontWeight: '700', marginBottom: h(3) },
  metricValue: { fontSize: f(13), fontWeight: '800' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: w(6), borderRadius: 8, paddingVertical: h(10) },
  primaryText: { color: COLORS.white, fontWeight: '800', fontSize: f(12) },
  completedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: w(6), paddingVertical: h(8) },
  completedText: { color: '#38A169', fontWeight: '800', fontSize: f(12) },
  emptyText: { color: COLORS.textMuted, fontSize: f(13), textAlign: 'center' },
});
