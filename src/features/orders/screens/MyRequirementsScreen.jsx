import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { SafeScreen } from '../../../shared/components/SafeScreen';
import AppHeader from '../../../shared/components/AppHeader';
import COLORS from '../../../theme/colors';
import { w, h, f } from '../../../shared/utils/responsive';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { selectSelectedRole, selectUser } from '../../../store/authSelectors';
import { requirementService } from '../orders.api';
import AddYourRequirement from '../components/AddYourRequirement';
import { ROLE_THEMES } from '../../../theme/roleThemes';

// Status color + icon mapping
const STATUS_CONFIG = {
  OPEN:             { color: '#16A34A', bg: '#DCFCE7', icon: 'checkbox-blank-circle' },
  'PARTIALLY FILLED': { color: '#D97706', bg: '#FEF3C7', icon: 'circle-half-full' },
  FILLED:           { color: '#2563EB', bg: '#DBEAFE', icon: 'check-circle' },
  EXPIRED:          { color: '#6B7280', bg: '#F3F4F6', icon: 'timer-off-outline' },
  CANCELLED:        { color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Icon name={cfg.icon} size={11} color={cfg.color} style={{ marginRight: 3 }} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{status}</Text>
    </View>
  );
}

function RequirementCard({ req, theme, t, navigation }) {
  return (
    <View style={[styles.card, { borderColor: theme.primary + '35' }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardCommodity, { color: theme.primary }]} numberOfLines={1}>
          {req.commodity || '—'}
        </Text>
        <StatusBadge status={req.status} />
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.cardChip, { backgroundColor: theme.primary + '08' }]}>
          <Icon name="weight" size={13} color={theme.primary} />
          <Text style={[styles.chipText, { color: theme.primary }]}>
            {req.quantity} {req.unit || 'Quintal'}
          </Text>
        </View>
        {req.expectedPrice > 0 && (
          <View style={[styles.cardChip, { backgroundColor: theme.primary + '08' }]}>
            <Icon name="tag-outline" size={13} color={theme.primary} />
            <Text style={[styles.chipText, { color: theme.primary }]}>
              ₹{req.expectedPrice} / {req.unit || 'Quintal'}
            </Text>
          </View>
        )}
        {req.location ? (
          <View style={[styles.cardChip, { backgroundColor: theme.primary + '08' }]}>
            <Icon name="map-marker-radius-outline" size={13} color={theme.primary} />
            <Text style={[styles.chipText, { color: theme.primary }]} numberOfLines={1}>{req.location}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooterRow}>
        {req.deliveryDate ? (
          <View style={styles.footerMetaItem}>
            <Icon name="truck-delivery-outline" size={12} color="#64748B" />
            <Text style={styles.cardMeta}>{req.deliveryDate}</Text>
          </View>
        ) : null}
        {req.harvestYear ? (
          <View style={styles.footerMetaItem}>
            <Icon name="calendar-blank-outline" size={12} color="#64748B" />
            <Text style={styles.cardMeta}>{req.harvestYear}</Text>
          </View>
        ) : null}
        <Text style={styles.cardDate}>
          {t('Posted:')} {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN') : ''}
        </Text>
      </View>

      {req.remarks ? (
        <View style={styles.cardRemarksContainer}>
          <Text style={styles.cardRemarks} numberOfLines={2}>
            "{req.remarks}"
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.viewQuotesBtn, { borderColor: theme.primary, backgroundColor: theme.primary + '03' }]}
        onPress={() => navigation.navigate('BuyerQuoteDashboard', { requirement: req })}
        activeOpacity={0.8}
      >
        <Icon name="message-text-outline" size={16} color={theme.primary} />
        <Text style={[styles.viewQuotesBtnText, { color: theme.primary }]}>
          {t('View Quotes')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MyRequirementsScreen({ navigation }) {
  const { t } = useTranslation();
  const user = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Ref to track requirements and avoid stale state in useCallback without re-triggering focus effect
  const requirementsRef = useRef([]);
  useEffect(() => {
    requirementsRef.current = requirements;
  }, [requirements]);

  const fetchRequirements = useCallback(async (isRefresh = false) => {
    try {
      const hasNoData = !requirementsRef.current || requirementsRef.current.length === 0;
      if (!isRefresh && hasNoData) {
        setLoading(true);
      }
      const data = await requirementService.getMyRequirements();
      setRequirements(data || []);
    } catch (err) {
      console.error('[MyRequirementsScreen] Fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRequirements();
    }, [fetchRequirements]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequirements(true);
  }, [fetchRequirements]);

  const handleSubmit = useCallback(async (payload) => {
    await requirementService.submitRequirement(payload);
    setShowModal(false);
    fetchRequirements();
  }, [fetchRequirements]);

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="clipboard-text-outline" size={56} color={theme.primary + '60'} />
      <Text style={[styles.emptyTitle, { color: theme.primary }]}>
        {t('No requirements yet')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {t('Post your first requirement and let sellers contact you.')}
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Icon name="plus" size={18} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.emptyBtnText}>{t('Post Requirement')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeScreen style={{ flex: 1, backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title={t('My Requirements')}
        subtitle={t(`${requirements.length} posted`)}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loaderText, { color: theme.primary }]}>{t('Loading...')}</Text>
        </View>
      ) : (
        <FlatList
          data={requirements}
          keyExtractor={(item, idx) => item._id || String(idx)}
          renderItem={({ item }) => <RequirementCard req={item} theme={theme} t={t} navigation={navigation} />}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={[
            styles.listContent,
            requirements.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB — Post new requirement */}
      {!loading && requirements.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <AddYourRequirement
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        theme={theme}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: h(12),
  },
  loaderText: {
    fontSize: f(14),
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: w(16),
    paddingTop: h(12),
    paddingBottom: h(120),
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: h(12),
    padding: w(14),
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(10),
  },
  cardCommodity: {
    fontSize: f(16),
    fontWeight: '800',
    flex: 1,
    marginRight: w(8),
    letterSpacing: -0.2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: w(8),
    paddingVertical: h(3),
    borderRadius: 20,
  },
  badgeText: {
    fontSize: f(9.5),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(8),
    marginBottom: h(4),
  },
  cardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    gap: w(4),
  },
  chipText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: h(12),
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(12),
    flexWrap: 'wrap',
  },
  footerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
  },
  cardMeta: {
    fontSize: f(11),
    color: '#64748B',
    fontWeight: '600',
  },
  cardDate: {
    fontSize: f(11),
    color: '#94A3B8',
    marginLeft: 'auto',
    fontWeight: '500',
  },
  cardRemarksContainer: {
    marginTop: h(10),
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: w(8),
    borderLeftWidth: 3,
    borderLeftColor: '#E2E8F0',
  },
  cardRemarks: {
    fontSize: f(11.5),
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: f(17),
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: w(32),
    gap: h(12),
  },
  emptyTitle: {
    fontSize: f(18),
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: f(13),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: f(20),
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: w(20),
    paddingVertical: h(12),
    borderRadius: 12,
    marginTop: h(8),
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: f(15),
    fontWeight: '800',
  },

  // FAB (safe bottom offset of h(95) to ensure it sits cleanly above bottom navigations)
  fab: {
    position: 'absolute',
    right: w(20),
    bottom: h(95),
    width: w(56),
    height: w(56),
    borderRadius: w(28),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  viewQuotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: w(6),
    marginTop: h(12),
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: h(9),
  },
  viewQuotesBtnText: {
    fontSize: f(12),
    fontWeight: '800',
  },
});
