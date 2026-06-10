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
        message: 'Please fill out Commodity Name, Quantity, and Expected Price.',
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
        title="Post Sell Offer"
        subtitle="Publish crop stock details to find buyers"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Section 1: Crop Basics */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="corn" size={20} color={theme.primary} />
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Crop Specifications</Text>
          </View>

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
                placeholder="e.g. Lokwan, Desi"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Available Qty *</Text>
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
              <Text style={styles.inputLabel}>Unit</Text>
              <View style={styles.pickerRow}>
                {['Ton', 'Quintal', 'Kg'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[
                      styles.pickerChip,
                      unit === u && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                  >
                    <Text style={[styles.pickerChipText, unit === u && { color: COLORS.white, fontWeight: '700' }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Expected Price & Counter Bids */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="currency-inr" size={20} color={theme.primary} />
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Pricing & Counter Bids</Text>
          </View>

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
                    style={[
                      styles.pickerChip,
                      sellingPriceUnit === pu && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                  >
                    <Text style={[styles.pickerChipText, sellingPriceUnit === pu && { color: COLORS.white, fontWeight: '700' }]}>{pu}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Allow Bidding / Counter Offers</Text>
              <Text style={styles.switchDesc}>Permit buyers to negotiate the price</Text>
            </View>
            <Switch
              value={isNegotiable}
              onValueChange={setIsNegotiable}
              trackColor={{ false: '#DEE2E6', true: theme.primary + '80' }}
              thumbColor={isNegotiable ? theme.primary : '#F1F3F5'}
            />
          </View>

          {isNegotiable && (
            <View style={styles.row}>
              <View style={styles.thirdCol}>
                <Text style={styles.inputLabel}>Min Price (₹)</Text>
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
                <Text style={styles.inputLabel}>Max Rounds</Text>
                <TextInput
                  style={styles.textInput}
                  value={maxNegotiationRounds}
                  onChangeText={setMaxNegotiationRounds}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.thirdCol}>
                <Text style={styles.inputLabel}>Expiry (Hrs)</Text>
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
        </View>

        {/* Section 3: Delivery & Logistics */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="truck-delivery-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Logistics & Fulfillment</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Delivery Clause</Text>
              <View style={styles.pickerRow}>
                {['FOR', 'EX_WAREHOUSE'].map((dt) => (
                  <TouchableOpacity
                    key={dt}
                    onPress={() => setDeliveryType(dt)}
                    style={[
                      styles.pickerChip,
                      deliveryType === dt && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                  >
                    <Text style={[styles.pickerChipText, deliveryType === dt && { color: COLORS.white, fontWeight: '700' }]}>
                      {dt === 'FOR' ? 'Delivered (FOR)' : 'Ex-Warehouse'}
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
                    style={[
                      styles.pickerChip,
                      weightType === wType && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                  >
                    <Text style={[styles.pickerChipText, weightType === wType && { color: COLORS.white, fontWeight: '700' }]}>{wType}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Stock Location</Text>
              <TextInput
                style={styles.textInput}
                value={commodityLocation}
                onChangeText={setCommodityLocation}
                placeholder="e.g. Indore, MP"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Listing Expiry Date</Text>
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
            placeholder="Seller organization billing details"
            placeholderTextColor={COLORS.textMuted}
          />

          {deliveryType === 'EX_WAREHOUSE' && (
            <>
              <Text style={styles.inputLabel}>Pickup Warehouse Address</Text>
              <TextInput
                style={styles.textInput}
                value={exWarehouseAddress}
                onChangeText={setExWarehouseAddress}
                placeholder="Exact warehouse/mandi storage location"
                placeholderTextColor={COLORS.textMuted}
              />
            </>
          )}

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>🔐 Secured Escrow Deal</Text>
              <Text style={styles.switchDesc}>Secure funds in neutral escrow account before dispatch</Text>
            </View>
            <Switch
              value={escrowEnabled}
              onValueChange={setEscrowEnabled}
              trackColor={{ false: '#DEE2E6', true: theme.primary + '80' }}
              thumbColor={escrowEnabled ? theme.primary : '#F1F3F5'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Allow Buyer Arranged Logistics</Text>
              <Text style={styles.switchDesc}>Buyer has option to supply their own transport</Text>
            </View>
            <Switch
              value={buyerTransportAllowed}
              onValueChange={setBuyerTransportAllowed}
              trackColor={{ false: '#DEE2E6', true: theme.primary + '80' }}
              thumbColor={buyerTransportAllowed ? theme.primary : '#F1F3F5'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Weight Tolerance</Text>
              <TextInput
                style={styles.textInput}
                value={weightTolerance}
                onChangeText={setWeightTolerance}
                placeholder="e.g. +/- 1%"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.inputLabel}>Payment Release Clause</Text>
              <TextInput
                style={styles.textInput}
                value={paymentTimeline}
                onChangeText={setPaymentTimeline}
                placeholder="e.g. Within 3 days of delivery"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Section 4: Quality Parameters & Media */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="clipboard-check-outline" size={20} color={theme.primary} />
            <Text style={[styles.sectionHeading, { color: theme.primary }]}>Quality & Lab Assays</Text>
          </View>

          <Text style={styles.subCardLabel}>Active Crop Quality Parameters</Text>
          <View style={styles.paramContainer}>
            {qualityParameters.map((param, index) => (
              <View key={index} style={styles.paramChipRow}>
                <View style={styles.paramLeft}>
                  <Icon name="circle-medium" size={16} color={theme.primary} />
                  <Text style={styles.paramNameText}>{param.name}:</Text>
                  <Text style={styles.paramValText}>{param.val}</Text>
                </View>
                <TouchableOpacity onPress={() => removeQualityParameter(index)}>
                  <Icon name="close" size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.paramAddForm}>
              <TextInput
                style={[styles.textInput, styles.paramInput]}
                placeholder="Name (e.g. Moisture)"
                placeholderTextColor={COLORS.textMuted}
                value={newParamName}
                onChangeText={setNewParamName}
              />
              <TextInput
                style={[styles.textInput, styles.paramInput]}
                placeholder="Val (e.g. 10%)"
                placeholderTextColor={COLORS.textMuted}
                value={newParamVal}
                onChangeText={setNewParamVal}
              />
              <TouchableOpacity onPress={addQualityParameter} style={[styles.paramAddButton, { backgroundColor: theme.primary }]}>
                <Icon name="plus" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Media upload buttons */}
          <View style={[styles.row, { marginTop: h(10) }]}>
            <TouchableOpacity
              onPress={() => {
                setHasImages(true);
                showAlert({ type: 'success', title: 'Attached', message: 'Mock commodity stock images attached.' });
              }}
              style={[
                styles.mediaBtn,
                { borderColor: theme.primary },
                hasImages && { backgroundColor: theme.primary + '10' }
              ]}
            >
              <Icon name={hasImages ? "checkbox-marked-circle-outline" : "camera-outline"} size={18} color={theme.primary} />
              <Text style={[styles.mediaBtnText, { color: theme.primary }]}>
                {hasImages ? 'Images Added' : 'Add Crop Photos'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setHasReport(true);
                showAlert({ type: 'success', title: 'Attached', message: 'Government assay report PDF attached.' });
              }}
              style={[
                styles.mediaBtn,
                { borderColor: theme.primary },
                hasReport && { backgroundColor: theme.primary + '10' }
              ]}
            >
              <Icon name={hasReport ? "checkbox-marked-circle-outline" : "file-pdf-box"} size={18} color={theme.primary} />
              <Text style={[styles.mediaBtnText, { color: theme.primary }]}>
                {hasReport ? 'Report Added' : 'Add Lab Report'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { marginTop: h(12) }]}>Additional Remarks / Terms</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            multiline
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any special storage, packing, or transport remarks..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          onPress={handlePostListing}
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <View style={styles.submitBtnRow}>
              <Icon name="cloud-upload-outline" size={20} color={COLORS.white} />
              <Text style={styles.submitBtnText}>Publish Sell Listing</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: w(14),
    paddingTop: h(14),
    paddingBottom: h(40),
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: mw(14),
    padding: w(16),
    marginBottom: h(14),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1A202C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: h(10),
    marginBottom: h(14),
  },
  sectionHeading: {
    fontSize: f(14),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: h(12),
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
    borderColor: '#E2E8F0',
    borderRadius: mw(8),
    paddingHorizontal: w(10),
    height: h(40),
    fontSize: f(13),
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
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
    borderColor: '#E2E8F0',
    borderRadius: mw(8),
    paddingVertical: h(8),
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F8FAFC',
    borderRadius: mw(10),
    padding: mw(12),
    marginVertical: h(10),
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  subCardLabel: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: h(8),
  },
  paramContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: mw(10),
    padding: mw(10),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paramChipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: h(8),
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  paramLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paramNameText: {
    fontSize: f(12),
    color: COLORS.textLight,
    marginRight: w(4),
  },
  paramValText: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
  },
  paramAddForm: {
    flexDirection: 'row',
    marginTop: h(10),
    gap: w(6),
    alignItems: 'center',
  },
  paramInput: {
    flex: 1,
    height: h(36),
  },
  paramAddButton: {
    width: mw(36),
    height: mw(36),
    borderRadius: mw(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: mw(10),
    paddingVertical: h(12),
    gap: w(6),
    backgroundColor: '#F8FAFC',
  },
  mediaBtnText: {
    fontSize: f(12),
    fontWeight: '700',
  },
  textArea: {
    height: h(64),
    textAlignVertical: 'top',
    paddingTop: h(10),
    marginTop: h(4),
  },
  submitBtn: {
    height: h(48),
    borderRadius: mw(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: h(10),
    shadowColor: '#1A202C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(8),
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: f(14),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
