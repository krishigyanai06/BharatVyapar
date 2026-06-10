import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { SafeScreen } from '../../../components/SafeScreen';
import AppHeader from '../../../components/AppHeader';
import COLORS from '../../../constant/colors';
import { w, h, mw, f } from '../../../utils/responsive';

const ROLE_THEMES = {
  FPO: { primary: COLORS.fpoPrimary, secondary: COLORS.fpoSecondary, light: COLORS.fpoLight, text: COLORS.fpoText },
  Trader: { primary: COLORS.traderPrimary, secondary: COLORS.traderSecondary, light: COLORS.traderLight, text: COLORS.traderText },
  Miller: { primary: COLORS.millerPrimary, secondary: COLORS.millerSecondary, light: COLORS.millerLight, text: COLORS.millerText },
  Corporate: { primary: COLORS.corporatePrimary, secondary: COLORS.corporateSecondary, light: COLORS.corporateLight, text: COLORS.corporateText },
};

const MOCK_OFFERS = [
  {
    id: 'OFF-7721',
    buyerName: 'Vikas Trading Corp',
    buyerRating: 4.7,
    buyerLocation: 'Indore, MP',
    price: 2420,
    priceUnit: 'Qt',
    quantity: 50,
    unit: 'Ton',
    value: '₹12,10,000',
    deliveryType: 'FOR',
    paymentTimeline: 'Within 3 days of delivery',
    status: 'In Negotiation',
    statusColor: '#DD6B20',
    date: '09 Jun 2026',
    remarks: 'We require immediate delivery, transport arranged by us.',
  },
  {
    id: 'OFF-7692',
    buyerName: 'Kailash Millers Ltd',
    buyerRating: 4.5,
    buyerLocation: 'Ujjain, MP',
    price: 2400,
    priceUnit: 'Qt',
    quantity: 40,
    unit: 'Ton',
    value: '₹9,60,000',
    deliveryType: 'EX_WAREHOUSE',
    paymentTimeline: 'Immediate on dispatch verification',
    status: 'Pending Review',
    statusColor: '#3182CE',
    date: '08 Jun 2026',
    remarks: 'Ready to lift from your warehouse. Jute bags preferred.',
  },
  {
    id: 'OFF-7540',
    buyerName: 'Adani Agri Logistics',
    buyerRating: 4.9,
    buyerLocation: 'Bhopal, MP',
    price: 2380,
    priceUnit: 'Qt',
    quantity: 50,
    unit: 'Ton',
    value: '₹11,90,000',
    deliveryType: 'FOR',
    paymentTimeline: 'CAD (Cash Against Documents)',
    status: 'Rejected',
    statusColor: '#E53E3E',
    date: '07 Jun 2026',
    remarks: 'Our price limit is final.',
  },
];

export default function ReceivedOffersScreen({ route, navigation }) {
  const { user, selectedRole: stateRole } = useSelector(state => state.auth);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const item = route?.params?.item || {
    commodityName: 'Wheat',
    type: 'Lokwan Premium',
    quantity: '50',
    unit: 'Ton',
    sellingPrice: 2450,
    sellingPriceUnit: 'Qt',
  };

  const handleOfferPress = (offer) => {
    navigation.navigate('NegotiationDetails', { offer, item });
  };

  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title="Received Offers"
        subtitle={`${item.commodityName} (${item.type})`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.listingSummaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>My Asking Price:</Text>
          <Text style={styles.summaryValue}>₹{item.sellingPrice}/{item.sellingPriceUnit}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Listed Quantity:</Text>
          <Text style={styles.summaryValue}>{item.quantity} {item.unit}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionHeading, { color: theme.primary }]}>Active Buyers Offers ({MOCK_OFFERS.length})</Text>

        {MOCK_OFFERS.map((offer) => (
          <TouchableOpacity
            key={offer.id}
            style={styles.offerCard}
            onPress={() => handleOfferPress(offer)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.buyerName}>{offer.buyerName}</Text>
                <View style={styles.buyerMeta}>
                  <Icon name="star" size={14} color="#D69E2E" />
                  <Text style={styles.buyerMetaText}>{offer.buyerRating} • {offer.buyerLocation}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: offer.statusColor + '15' }]}>
                <Text style={[styles.statusText, { color: offer.statusColor }]}>{offer.status}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.offerMetrics}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Price Proposed</Text>
                <Text style={[styles.metricValue, { color: theme.primary }]}>₹{offer.price}/{offer.priceUnit}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Quantity</Text>
                <Text style={styles.metricValue}>{offer.quantity} {offer.unit}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total Deal Val</Text>
                <Text style={styles.metricValue}>{offer.value}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.footerInfo}>
                <Icon name="truck-delivery" size={16} color={COLORS.textLight} />
                <Text style={styles.footerInfoText}>{offer.deliveryType === 'FOR' ? 'FOR Delivery' : 'Ex-Warehouse'}</Text>
              </View>
              <View style={styles.footerInfo}>
                <Icon name="calendar-range" size={16} color={COLORS.textLight} />
                <Text style={styles.footerInfoText}>{offer.date}</Text>
              </View>
            </View>

            {offer.remarks && (
              <View style={styles.remarksBlock}>
                <Text style={styles.remarksLabel}>Note:</Text>
                <Text style={styles.remarksText} numberOfLines={1}>"{offer.remarks}"</Text>
              </View>
            )}

            <View style={[styles.detailsLink, { backgroundColor: theme.primary + '0A' }]}>
              <Text style={[styles.detailsLinkText, { color: theme.primary }]}>View Negotiation & Respond</Text>
              <Icon name="chevron-right" size={18} color={theme.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: w(16),
    paddingBottom: h(30),
  },
  listingSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    paddingVertical: h(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  summaryRow: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: f(11),
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: f(14),
    fontWeight: '800',
    color: COLORS.text,
    marginTop: h(2),
  },
  sectionHeading: {
    fontSize: f(14),
    fontWeight: '800',
    marginBottom: h(12),
    marginTop: h(4),
  },
  offerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(14),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  buyerName: {
    fontSize: f(15),
    fontWeight: '800',
    color: COLORS.text,
  },
  buyerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
    marginTop: h(2),
  },
  buyerMetaText: {
    fontSize: f(11),
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: w(10),
    paddingVertical: h(4),
    borderRadius: 8,
  },
  statusText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F3F5',
    marginVertical: h(12),
  },
  offerMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: w(10),
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: h(12),
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginBottom: h(2),
  },
  metricValue: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(10),
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(4),
  },
  footerInfoText: {
    fontSize: f(11),
    color: COLORS.textLight,
  },
  remarksBlock: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: w(8),
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: h(12),
    flexDirection: 'row',
    gap: w(4),
  },
  remarksLabel: {
    fontSize: f(11),
    fontWeight: '700',
    color: '#D97706',
  },
  remarksText: {
    fontSize: f(11),
    color: '#78350F',
    flex: 1,
  },
  detailsLink: {
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: h(8),
    gap: w(4),
  },
  detailsLinkText: {
    fontSize: f(12),
    fontWeight: '800',
  },
});
