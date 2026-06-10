import React, { useState } from 'react';
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
import { showAlert } from '../../../components/CustomAlertBox';

const ROLE_THEMES = {
  FPO: { primary: COLORS.fpoPrimary, secondary: COLORS.fpoSecondary, light: COLORS.fpoLight, text: COLORS.fpoText },
  Trader: { primary: COLORS.traderPrimary, secondary: COLORS.traderSecondary, light: COLORS.traderLight, text: COLORS.traderText },
  Miller: { primary: COLORS.millerPrimary, secondary: COLORS.millerSecondary, light: COLORS.millerLight, text: COLORS.millerText },
  Corporate: { primary: COLORS.corporatePrimary, secondary: COLORS.corporateSecondary, light: COLORS.corporateLight, text: COLORS.corporateText },
};

const STAGES = [
  { status: 'pending_payment', title: '1. Fund Escrow', desc: 'Buyer deposits ₹12.10L to secure payment' },
  { status: 'funded', title: '2. Funded', desc: 'Escrow secured. Seller preparing dispatch' },
  { status: 'dispatched', title: '3. Dispatched', desc: 'Goods transit. Lorry & invoice uploaded' },
  { status: 'delivered', title: '4. Delivered', desc: 'Goods arrived. Quality verification ongoing' },
  { status: 'released', title: '5. Released', desc: 'Funds released to seller. Deal completed!' },
];

export default function DealDetailsScreen({ route, navigation }) {
  const { user, selectedRole: stateRole } = useSelector(state => state.auth);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  // Active status in state for interactive prototype simulation
  const [dealStatus, setDealStatus] = useState('pending_payment');

  const dealInfo = {
    id: route?.params?.dealId || 'DL-5092',
    date: '09 Jun 2026',
    buyer: 'Vikas Trading Corp',
    seller: 'Malwa Farmer Producer Org (FPO)',
    commodity: 'Wheat (Lokwan Premium)',
    grade: 'A+',
    quantity: '50 Ton',
    unitPrice: '₹2,420 / Qt',
    totalValue: '₹12,10,000',
    deliveryType: 'FOR',
    paymentTimeline: 'Escrow Lock - Released on delivery verification',
  };

  // Get index of current stage
  const currentStageIndex = STAGES.findIndex(s => s.status === dealStatus);

  // Simulation handlers
  const handleFundEscrow = () => {
    showAlert({
      type: 'confirm',
      title: 'Deposit Funds',
      message: 'Would you like to simulate Vikas Trading Corp depositing ₹12,10,000 in the secure Escrow account?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deposit',
          onPress: () => {
            setDealStatus('funded');
            showAlert({
              type: 'success',
              title: 'Escrow Funded',
              message: 'Payment received. Notification sent to Seller to initiate dispatch.',
            });
          },
        },
      ],
    });
  };

  const handleDispatch = () => {
    showAlert({
      type: 'confirm',
      title: 'Dispatch Goods',
      message: 'Simulate dispatching goods? Enter mock vehicle details (MH-09-CQ-2812) and upload lorry receipt.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Dispatched',
          onPress: () => {
            setDealStatus('dispatched');
            showAlert({
              type: 'success',
              title: 'Dispatched & Transit',
              message: 'Lorry details and commercial invoice uploaded. GPS tracking activated.',
            });
          },
        },
      ],
    });
  };

  const handleConfirmDelivery = () => {
    setDealStatus('delivered');
    showAlert({
      type: 'info',
      title: 'Goods Arrived',
      message: 'Goods received at buyer site. Quality inspection triggered.',
    });
  };

  const handleReleasePayment = () => {
    showAlert({
      type: 'confirm',
      title: 'Release Payment',
      message: 'Inspection passed. Confirm releasing ₹12,10,000 escrow funds to Malwa FPO?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Funds',
          onPress: () => {
            setDealStatus('released');
            showAlert({
              type: 'success',
              title: 'Deal Completed',
              message: 'Funds released successfully. Contract closed.',
            });
          },
        },
      ],
    });
  };

  const handleReset = () => {
    setDealStatus('pending_payment');
  };

  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title="Escrow Deal Details"
        subtitle={dealInfo.id}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Deal Summary Header */}
        <View style={styles.dealCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.commodityTitle}>{dealInfo.commodity}</Text>
              <Text style={styles.dealMeta}>Contract Date: {dealInfo.date}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.badgeText, { color: theme.primary }]}>Escrow Enabled</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.label}>Buyer:</Text>
            <Text style={styles.value}>{dealInfo.buyer}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Seller:</Text>
            <Text style={styles.value}>{dealInfo.seller}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Quantity:</Text>
            <Text style={styles.value}>{dealInfo.quantity} (Grade {dealInfo.grade})</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Contract Value:</Text>
            <Text style={[styles.value, { fontWeight: '800', color: theme.primary }]}>{dealInfo.totalValue}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Delivery Basis:</Text>
            <Text style={styles.value}>{dealInfo.deliveryType === 'FOR' ? 'FOR Destination' : 'Ex-Warehouse'}</Text>
          </View>
        </View>

        {/* Stepper Status Tracking */}
        <View style={styles.stepperContainer}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Escrow & Logistics Stepper</Text>

          {STAGES.map((st, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isActive = idx === currentStageIndex;
            const isFuture = idx > currentStageIndex;

            let iconName = 'checkbox-blank-circle-outline';
            let iconColor = COLORS.textMuted;
            if (isCompleted) {
              iconName = 'check-circle';
              iconColor = COLORS.success;
            } else if (isActive) {
              iconName = 'circle-slice-8';
              iconColor = theme.primary;
            }

            return (
              <View key={st.status} style={styles.stepRow}>
                {/* Visual Line connector */}
                <View style={styles.stepIndicator}>
                  <Icon name={iconName} size={22} color={iconColor} />
                  {idx < STAGES.length - 1 && (
                    <View 
                      style={[
                        styles.stepLine, 
                        { backgroundColor: isCompleted ? COLORS.success : '#E9ECEF' }
                      ]} 
                    />
                  )}
                </View>

                {/* Step Text Info */}
                <View style={[styles.stepTextContent, isActive && styles.activeStepBg]}>
                  <Text 
                    style={[
                      styles.stepTitle, 
                      isActive && { color: theme.primary, fontWeight: '800' },
                      isCompleted && { color: COLORS.success }
                    ]}
                  >
                    {st.title}
                  </Text>
                  <Text style={styles.stepDesc}>{st.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Invoices & Documents Section */}
        <View style={styles.docsCard}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Deal Documents</Text>

          <TouchableOpacity 
            style={styles.docItem}
            onPress={() => showAlert({ type: 'info', title: 'Contract', message: 'Opening Digitally signed tripartite contract agreement.' })}
          >
            <View style={styles.docInfo}>
              <Icon name="file-sign" size={24} color="#007799" />
              <View>
                <Text style={styles.docTitle}>Tripartite Contract Agreement.pdf</Text>
                <Text style={styles.docMeta}>Signed by Buyer, Seller & Escrow Agent</Text>
              </View>
            </View>
            <Icon name="download" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          {currentStageIndex >= 2 && (
            <TouchableOpacity 
              style={styles.docItem}
              onPress={() => showAlert({ type: 'info', title: 'Commercial Invoice', message: 'Opening seller commercial invoice.' })}
            >
              <View style={styles.docInfo}>
                <Icon name="file-percent" size={24} color="#D69E2E" />
                <View>
                  <Text style={styles.docTitle}>Commercial_Invoice_MalwaFPO.pdf</Text>
                  <Text style={styles.docMeta}>Tax invoice submitted by Seller</Text>
                </View>
              </View>
              <Icon name="download" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}

          {currentStageIndex >= 2 && (
            <TouchableOpacity 
              style={styles.docItem}
              onPress={() => showAlert({ type: 'info', title: 'Lorry Receipt', message: 'Opening transport Lorry Receipt.' })}
            >
              <View style={styles.docInfo}>
                <Icon name="file-cabinet" size={24} color="#805AD5" />
                <View>
                  <Text style={styles.docTitle}>Lorry_Receipt_MH09CQ2812.pdf</Text>
                  <Text style={styles.docMeta}>Lorry bill of lading submitted on dispatch</Text>
                </View>
              </View>
              <Icon name="download" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Prototype Simulation Tools */}
        <View style={styles.simulationCard}>
          <View style={styles.simulationHeader}>
            <Icon name="cogs" size={18} color="#4A5568" />
            <Text style={styles.simulationTitle}>Interactive Flow Simulator</Text>
          </View>
          <Text style={styles.simulationDesc}>
            Press the buttons below to manually shift deal status to demonstrate correct API/REST-escrow behavior.
          </Text>

          <View style={styles.simActionsRow}>
            {dealStatus === 'pending_payment' && (
              <TouchableOpacity style={[styles.simBtn, { backgroundColor: theme.primary }]} onPress={handleFundEscrow}>
                <Text style={styles.simBtnText}>💸 Simulate Buyer Payment</Text>
              </TouchableOpacity>
            )}

            {dealStatus === 'funded' && (
              <TouchableOpacity style={[styles.simBtn, { backgroundColor: theme.primary }]} onPress={handleDispatch}>
                <Text style={styles.simBtnText}>🚚 Simulate Seller Dispatch</Text>
              </TouchableOpacity>
            )}

            {dealStatus === 'dispatched' && (
              <View style={{ gap: h(8), width: '100%' }}>
                <TouchableOpacity style={[styles.simBtn, { backgroundColor: '#3182CE' }]} onPress={handleConfirmDelivery}>
                  <Text style={styles.simBtnText}>📍 Simulate Cargo Arrival</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.simBtn, { backgroundColor: theme.primary }]} onPress={handleReleasePayment}>
                  <Text style={styles.simBtnText}>🔓 Release Escrow Funds</Text>
                </TouchableOpacity>
              </View>
            )}

            {dealStatus === 'delivered' && (
              <TouchableOpacity style={[styles.simBtn, { backgroundColor: theme.primary }]} onPress={handleReleasePayment}>
                <Text style={styles.simBtnText}>🔓 Release Escrow Funds</Text>
              </TouchableOpacity>
            )}

            {dealStatus === 'released' && (
              <View style={styles.completedAlert}>
                <Icon name="check-decagram" size={22} color={COLORS.success} />
                <Text style={styles.completedText}>Escrow payment successfully settled! Deal Completed.</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>🔄 Reset Deal Flow</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: h(40) }} />
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: w(16),
  },
  dealCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
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
  commodityTitle: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.text,
  },
  dealMeta: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  badge: {
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    borderRadius: 6,
  },
  badgeText: {
    fontSize: f(10),
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F3F5',
    marginVertical: h(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(8),
  },
  label: {
    fontSize: f(12),
    color: COLORS.textLight,
  },
  value: {
    fontSize: f(12),
    color: COLORS.text,
    fontWeight: '600',
  },
  stepperContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: f(14),
    fontWeight: '800',
    marginBottom: h(16),
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: h(4),
  },
  stepIndicator: {
    alignItems: 'center',
    width: w(30),
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: h(4),
  },
  stepTextContent: {
    flex: 1,
    paddingBottom: h(16),
    paddingHorizontal: w(8),
    borderRadius: 8,
  },
  activeStepBg: {
    backgroundColor: '#F8F9FA',
  },
  stepTitle: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  stepDesc: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
    lineHeight: h(14),
  },
  docsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: h(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(10),
    flex: 1,
  },
  docTitle: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
  },
  docMeta: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginTop: h(1),
  },
  simulationCard: {
    backgroundColor: '#EDF2F7',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
  },
  simulationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
    marginBottom: h(4),
  },
  simulationTitle: {
    fontSize: f(13),
    fontWeight: '800',
    color: '#4A5568',
  },
  simulationDesc: {
    fontSize: f(11),
    color: '#718096',
    lineHeight: h(15),
    marginBottom: h(12),
  },
  simActionsRow: {
    width: '100%',
  },
  simBtn: {
    height: h(42),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  simBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(13),
  },
  completedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    padding: w(10),
    borderRadius: 8,
    backgroundColor: '#C6F6D5',
    borderWidth: 1,
    borderColor: '#9AE6B4',
  },
  completedText: {
    fontSize: f(11),
    color: '#22543D',
    fontWeight: '700',
    flex: 1,
  },
  resetBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: h(12),
    paddingVertical: h(6),
  },
  resetBtnText: {
    fontSize: f(11),
    color: '#4A5568',
    fontWeight: '700',
  },
});
