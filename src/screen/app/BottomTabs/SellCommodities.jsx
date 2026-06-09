import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
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

export default function SellCommodities() {
  const { user, selectedRole: stateRole } = useSelector(state => state.auth);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  // Form State fields
  const [commodityName, setCommodityName] = useState('');
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Ton');
  const [sellingPrice, setSellingPrice] = useState('');
  const [sellingPriceUnit, setSellingPriceUnit] = useState('Qt');
  const [weightType, setWeightType] = useState('Net Weight');
  const [listingEndDate, setListingEndDate] = useState('2026-07-31');
  const [weightTolerance, setWeightTolerance] = useState('+/- 1%');
  const [billingAddress, setBillingAddress] = useState('Indore Mandi Complex, MP');
  const [exWarehouseAddress, setExWarehouseAddress] = useState('');
  const [paymentTimeline, setPaymentTimeline] = useState('Within 3 days of delivery');
  const [remarks, setRemarks] = useState('');
  const [deliveryType, setDeliveryType] = useState('FOR');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [minimumAcceptablePrice, setMinimumAcceptablePrice] = useState('');
  const [maxNegotiationRounds, setMaxNegotiationRounds] = useState('5');
  const [offerExpiryHours, setOfferExpiryHours] = useState('24');
  const [commodityLocation, setCommodityLocation] = useState('Indore, MP');
  const [escrowEnabled, setEscrowEnabled] = useState(true);
  const [buyerTransportAllowed, setBuyerTransportAllowed] = useState(false);

  // Dynamic parameters
  const [qualityParameters, setQualityParameters] = useState([
    { name: 'Moisture', val: '12%' },
    { name: 'Foreign Matter', val: '1%' },
  ]);
  const [newParamName, setNewParamName] = useState('');
  const [newParamVal, setNewParamVal] = useState('');

  // Image & Quality PDF Mock Statuses
  const [hasImages, setHasImages] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addQualityParameter = () => {
    if (!newParamName || !newParamVal) return;
    setQualityParameters([...qualityParameters, { name: newParamName, val: newParamVal }]);
    setNewParamName('');
    setNewParamVal('');
  };

  const removeQualityParameter = (index) => {
    setQualityParameters(qualityParameters.filter((_, i) => i !== index));
  };

  const handlePostListing = () => {
    if (!commodityName || !quantity || !sellingPrice) {
      showAlert({
        type: 'error',
        title: 'Fields Required',
        message: 'Please fill out Commodity Name, Quantity, and Selling Price.',
      });
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);

      // Reset form
      setCommodityName('');
      setType('');
      setQuantity('');
      setSellingPrice('');
      setRemarks('');
      setHasImages(false);
      setHasReport(false);

      showAlert({
        type: 'info',
        title: 'Listing Created',
        message: 'Your commodity sell offer has been published successfully.',
        buttons: [{ text: 'OK' }],
      });
    }, 1500);
  };

  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title="Sell Commodity"
        subtitle="List your harvest & negotiate with buyers"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={[styles.formHeading, { color: theme.primary }]}>Commodity Listing Details</Text>

          {/* Basic Info */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Commodity Name *</Text>
              <TextInput
                style={styles.textInput}
                value={commodityName}
                onChangeText={setCommodityName}
                placeholder="e.g. Wheat, Soybean"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Variety / Type</Text>
              <TextInput
                style={styles.textInput}
                value={type}
                onChangeText={setType}
                placeholder="e.g. Lokwan, Yellow"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Quantity *</Text>
              <TextInput
                style={styles.textInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="e.g. 50"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Quantity Unit</Text>
              <View style={styles.pickerRow}>
                {['Ton', 'Quintal', 'Kg'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[styles.pickerChip, unit === u && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.pickerChipText, unit === u && { color: COLORS.white }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Pricing Section */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Expected Price *</Text>
              <TextInput
                style={styles.textInput}
                value={sellingPrice}
                onChangeText={setSellingPrice}
                placeholder="e.g. 2400"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Per Unit</Text>
              <View style={styles.pickerRow}>
                {['Qt', 'Ton', 'Kg'].map((pu) => (
                  <TouchableOpacity
                    key={pu}
                    onPress={() => setSellingPriceUnit(pu)}
                    style={[styles.pickerChip, sellingPriceUnit === pu && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.pickerChipText, sellingPriceUnit === pu && { color: COLORS.white }]}>{pu}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Negotiation Details */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Enable Negotiation</Text>
              <Text style={styles.switchDesc}>Allow buyers to place counter bids</Text>
            </View>
            <Switch
              value={isNegotiable}
              onValueChange={setIsNegotiable}
              trackColor={{ false: '#767577', true: theme.primary + '80' }}
              thumbColor={isNegotiable ? theme.primary : '#f4f3f4'}
            />
          </View>

          {isNegotiable && (
            <View style={styles.row}>
              <View style={styles.thirdCol}>
                <Text style={styles.inputLabel}>Min Price Acceptance</Text>
                <TextInput
                  style={styles.textInput}
                  value={minimumAcceptablePrice}
                  onChangeText={setMinimumAcceptablePrice}
                  placeholder="e.g. 2300"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.thirdCol}>
                <Text style={styles.inputLabel}>Max Counters</Text>
                <TextInput
                  style={styles.textInput}
                  value={maxNegotiationRounds}
                  onChangeText={setMaxNegotiationRounds}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.thirdCol}>
                <Text style={styles.inputLabel}>Bid Expiry (Hours)</Text>
                <TextInput
                  style={styles.textInput}
                  value={offerExpiryHours}
                  onChangeText={setOfferExpiryHours}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
          )}

          {/* Delivery Details */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Delivery Type</Text>
              <View style={styles.pickerRow}>
                {['FOR', 'EX_WAREHOUSE'].map((dt) => (
                  <TouchableOpacity
                    key={dt}
                    onPress={() => setDeliveryType(dt)}
                    style={[styles.pickerChip, deliveryType === dt && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.pickerChipText, deliveryType === dt && { color: COLORS.white }]}>
                      {dt === 'FOR' ? 'Freight Free (FOR)' : 'Ex-Warehouse'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Weight Basis</Text>
              <View style={styles.pickerRow}>
                {['Net Weight', 'Gross Weight'].map((wType) => (
                  <TouchableOpacity
                    key={wType}
                    onPress={() => setWeightType(wType)}
                    style={[styles.pickerChip, weightType === wType && { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.pickerChipText, weightType === wType && { color: COLORS.white }]}>{wType}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Location & Address */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Commodity Location</Text>
              <TextInput
                style={styles.textInput}
                value={commodityLocation}
                onChangeText={setCommodityLocation}
                placeholder="e.g. Indore, MP"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Listing End Date</Text>
              <TextInput
                style={styles.textInput}
                value={listingEndDate}
                onChangeText={setListingEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Billing Address</Text>
          <TextInput
            style={styles.textInput}
            value={billingAddress}
            onChangeText={setBillingAddress}
            placeholder="Full billing address"
            placeholderTextColor={COLORS.textMuted}
          />

          {deliveryType === 'EX_WAREHOUSE' && (
            <>
              <Text style={styles.inputLabel}>Ex-Warehouse Address</Text>
              <TextInput
                style={styles.textInput}
                value={exWarehouseAddress}
                onChangeText={setExWarehouseAddress}
                placeholder="Mandi or Warehouse complex address"
                placeholderTextColor={COLORS.textMuted}
              />
            </>
          )}

          {/* Logistic Preferences */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Escrow Deal Enabled</Text>
              <Text style={styles.switchDesc}>Payment secured via BharatVyapar partner Escrow</Text>
            </View>
            <Switch
              value={escrowEnabled}
              onValueChange={setEscrowEnabled}
              trackColor={{ false: '#767577', true: theme.primary + '80' }}
              thumbColor={escrowEnabled ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Buyer Transport Allowed</Text>
              <Text style={styles.switchDesc}>Let buyer arrange logistics and dispatch vehicles</Text>
            </View>
            <Switch
              value={buyerTransportAllowed}
              onValueChange={setBuyerTransportAllowed}
              trackColor={{ false: '#767577', true: theme.primary + '80' }}
              thumbColor={buyerTransportAllowed ? theme.primary : '#f4f3f4'}
            />
          </View>

          {/* Terms and Remarks */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Weight Tolerance</Text>
              <TextInput
                style={styles.textInput}
                value={weightTolerance}
                onChangeText={setWeightTolerance}
                placeholder="e.g. +/- 2%"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Payment Timeline</Text>
              <TextInput
                style={styles.textInput}
                value={paymentTimeline}
                onChangeText={setPaymentTimeline}
                placeholder="e.g. Immediate on dispatch"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Quality Parameters Array */}
          <Text style={[styles.sectionSubtitle, { color: theme.primary }]}>Quality Parameters</Text>
          <View style={styles.paramBox}>
            {qualityParameters.map((param, index) => (
              <View key={index} style={styles.paramRow}>
                <Text style={styles.paramText}>{param.name}: <Text style={{ fontWeight: '700' }}>{param.val}</Text></Text>
                <TouchableOpacity onPress={() => removeQualityParameter(index)}>
                  <Icon name="close-circle" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.paramAddRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, height: h(34), marginRight: w(6) }]}
                placeholder="Parameter (e.g. Moisture)"
                placeholderTextColor={COLORS.textMuted}
                value={newParamName}
                onChangeText={setNewParamName}
              />
              <TextInput
                style={[styles.textInput, { flex: 1, height: h(34), marginRight: w(6) }]}
                placeholder="Value (e.g. 10%)"
                placeholderTextColor={COLORS.textMuted}
                value={newParamVal}
                onChangeText={setNewParamVal}
              />
              <TouchableOpacity onPress={addQualityParameter} style={[styles.paramAddBtn, { backgroundColor: theme.primary }]}>
                <Icon name="plus" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Document Upload Simulation */}
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => {
                setHasImages(true);
                showAlert({ type: 'success', title: 'Attached', message: 'Mock commodity images attached.' });
              }}
              style={[styles.fileBtn, { borderColor: theme.primary }]}
            >
              <Icon name="camera" size={20} color={theme.primary} />
              <Text style={[styles.fileBtnText, { color: theme.primary }]}>
                {hasImages ? 'Images Attached' : 'Commodity Images'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setHasReport(true);
                showAlert({ type: 'success', title: 'Attached', message: 'Mock Quality Lab report PDF attached.' });
              }}
              style={[styles.fileBtn, { borderColor: theme.primary }]}
            >
              <Icon name="file-pdf-box" size={20} color={theme.primary} />
              <Text style={[styles.fileBtnText, { color: theme.primary }]}>
                {hasReport ? 'Report Attached' : 'Quality Report Lab'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Remarks / Custom Terms</Text>
          <TextInput
            style={[styles.textInput, { height: h(60), textAlignVertical: 'top' }]}
            multiline
            value={remarks}
            onChangeText={setRemarks}
            placeholder="e.g. Bags packing, immediate lift required..."
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handlePostListing}
            style={[styles.submitBtn, { backgroundColor: theme.primary }]}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Post Sell Offer</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: w(16),
    paddingBottom: h(40),
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  formHeading: {
    fontSize: f(16),
    fontWeight: '800',
    marginBottom: h(16),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(14),
    gap: w(10),
  },
  halfCol: {
    flex: 1,
  },
  thirdCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: f(11),
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: h(4),
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: mw(8),
    paddingHorizontal: w(10),
    height: h(40),
    fontSize: f(13),
    color: COLORS.text,
    backgroundColor: '#F8F9FA',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: w(4),
  },
  pickerChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: mw(8),
    paddingVertical: h(8),
    backgroundColor: '#F8F9FA',
  },
  pickerChipText: {
    fontSize: f(11),
    fontWeight: '600',
    color: COLORS.textLight,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: mw(8),
    padding: mw(10),
    marginBottom: h(14),
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  switchLabel: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
  },
  switchDesc: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  sectionSubtitle: {
    fontSize: f(13),
    fontWeight: '800',
    marginTop: h(6),
    marginBottom: h(8),
  },
  paramBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: mw(8),
    padding: mw(10),
    marginBottom: h(14),
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: h(6),
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  paramText: {
    fontSize: f(12),
    color: COLORS.text,
  },
  paramAddRow: {
    flexDirection: 'row',
    marginTop: h(8),
    alignItems: 'center',
  },
  paramAddBtn: {
    width: mw(34),
    height: mw(34),
    borderRadius: mw(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: mw(8),
    paddingVertical: h(10),
    gap: w(6),
    backgroundColor: '#F8F9FA',
  },
  fileBtnText: {
    fontSize: f(12),
    fontWeight: '700',
  },
  submitBtn: {
    height: h(46),
    borderRadius: mw(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: h(20),
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: f(15),
    fontWeight: '700',
  },
});
