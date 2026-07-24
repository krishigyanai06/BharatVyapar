import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DatePicker from 'react-native-date-picker';

const UNITS = ['Quintal', 'MT', 'Kg', 'Ton'];
const PRICE_UNITS = ['per Quintal', 'per MT', 'per Kg', 'per Ton'];
const TRADE_TYPES = ['FOR', 'EX-Warehouse'];
const PAYMENT_TIMELINES = ['Immediate', '7 Days', '15 Days', 'Advance'];

const DEFAULT_THEME = {
  primary: '#2E7D32',
  secondary: '#4CAF50',
  light: '#E8F5E9',
  text: '#1B5E20',
  accent: '#E91E63',
};

export default function AddYourRequirement({ visible, onClose, onSubmit, theme }) {
  const activeTheme = theme || DEFAULT_THEME;

  // Form State matching POST /api/buyer-requirement DTO
  const [commodityName, setCommodityName] = useState('');
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Quintal');
  const [targetPrice, setTargetPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('per Quintal');
  const [tradeType, setTradeType] = useState('FOR');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentTimeline, setPaymentTimeline] = useState('Immediate');
  const [remarks, setRemarks] = useState('');

  // Optional Quality/Date Specs
  const [grade, setGrade] = useState('');
  const [moisture, setMoisture] = useState('');
  const [harvestYear, setHarvestYear] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // UI & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [isHarvestPickerOpen, setIsHarvestPickerOpen] = useState(false);
  const [isDeliveryPickerOpen, setIsDeliveryPickerOpen] = useState(false);

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!commodityName || !commodityName.trim()) {
      newErrors.commodityName = 'Commodity name is required';
    }

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }

    if (!unit) {
      newErrors.unit = 'Unit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setCommodityName('');
    setType('');
    setQuantity('');
    setUnit('Quintal');
    setTargetPrice('');
    setPriceUnit('per Quintal');
    setTradeType('FOR');
    setDeliveryLocation('');
    setPaymentTimeline('Immediate');
    setRemarks('');
    setGrade('');
    setMoisture('');
    setHarvestYear('');
    setDeliveryDate('');
    setErrors({});
  };

  const handleSubmit = async () => {
    const isValid = validateForm();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const payload = {
        // Primary DTO keys for POST /api/buyer-requirement
        commodityName: commodityName.trim(),
        type: type.trim() || undefined,
        quantity: Number(quantity),
        unit,
        targetPrice: targetPrice ? Number(targetPrice) : undefined,
        priceUnit,
        tradeType,
        deliveryLocation: deliveryLocation.trim() || undefined,
        paymentTimeline,
        remarks: remarks.trim() || undefined,

        // Backward compatibility keys for existing caller screens
        commodity: commodityName.trim(),
        expectedPrice: targetPrice ? Number(targetPrice) : 0,
        location: deliveryLocation.trim(),
        grade: grade.trim() || undefined,
        moisture: moisture.trim() || undefined,
        harvestYear: harvestYear || undefined,
        deliveryDate: deliveryDate || undefined,
      };

      await onSubmit(payload);
      resetForm();
      onClose();
    } catch (e) {
      console.error('[AddYourRequirement] Submit failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const getInputStyle = (field) => [
    styles.input,
    errors[field] && styles.inputError,
    focusedField === field && {
      borderColor: errors[field] ? '#EF4444' : activeTheme.primary,
      backgroundColor: errors[field] ? '#FEF2F2' : '#FAFFFE',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: activeTheme.primary + '18' }]}>
            <View style={[styles.headerIcon, { backgroundColor: activeTheme.primary + '12' }]}>
              <Icon name="tag-heart-outline" size={20} color={activeTheme.primary} />
            </View>
            <View style={styles.headerTextBlock}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.title}>Add Buyer Requirement</Text>
                <View style={[styles.badgePill, { backgroundColor: activeTheme.primary + '15' }]}>
                  <Text style={[styles.badgeText, { color: activeTheme.primary }]}>BUYER</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>Post requirement to connect with verified sellers</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting} style={styles.closeBtn}>
              <Icon name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* SECTION 1: COMMODITY DETAILS */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="grain" size={16} color={activeTheme.primary} />
                <Text style={[styles.sectionLabel, { color: activeTheme.primary }]}>
                  Commodity Details <Text style={styles.requiredStar}>*</Text>
                </Text>
              </View>

              {/* Commodity Name */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>
                  Commodity Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.fieldWrapper}>
                  <Icon
                    name="store-outline"
                    size={16}
                    color={errors.commodityName ? '#EF4444' : '#64748B'}
                    style={styles.fieldIcon}
                  />
                  <TextInput
                    style={getInputStyle('commodityName')}
                    placeholder="e.g. Wheat, Soybean"
                    value={commodityName}
                    onChangeText={(val) => {
                      setCommodityName(val);
                      clearError('commodityName');
                    }}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setFocusedField('commodityName')}
                    onBlur={() => setFocusedField(null)}
                    includeFontPadding={false}
                    textAlignVertical="center"
                  />
                </View>
                {errors.commodityName && (
                  <Text style={styles.errorText}>{errors.commodityName}</Text>
                )}
              </View>

              {/* Variety / Type */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Variety / Type (Optional)</Text>
                <View style={styles.fieldWrapper}>
                  <Icon name="format-list-bulleted-type" size={16} color="#64748B" style={styles.fieldIcon} />
                  <TextInput
                    style={getInputStyle('type')}
                    placeholder="e.g. Sharbati, Lok-1"
                    value={type}
                    onChangeText={setType}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setFocusedField('type')}
                    onBlur={() => setFocusedField(null)}
                    includeFontPadding={false}
                    textAlignVertical="center"
                  />
                </View>
              </View>

              {/* Quantity & Unit Row */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>
                  Quantity & Unit <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.fieldWrapper}>
                  <TextInput
                    style={[getInputStyle('quantity'), styles.noIconInput]}
                    placeholder="e.g. 100"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={(val) => {
                      setQuantity(val);
                      clearError('quantity');
                    }}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setFocusedField('quantity')}
                    onBlur={() => setFocusedField(null)}
                    includeFontPadding={false}
                    textAlignVertical="center"
                  />
                </View>
                {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
              </View>

              {/* Unit Selector Pills */}
              <View style={styles.unitBlock}>
                <Text style={styles.subFieldLabel}>Select Unit</Text>
                <View style={styles.unitRow}>
                  {UNITS.map((u) => {
                    const selected = unit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        onPress={() => {
                          setUnit(u);
                          clearError('unit');
                          setPriceUnit(`per ${u}`);
                        }}
                        activeOpacity={0.75}
                        style={[
                          styles.unitChip,
                          selected
                            ? { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary }
                            : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitChipText,
                            { color: selected ? '#FFFFFF' : '#475569' },
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
              </View>
            </View>

            {/* SECTION 2: COMMERCIALS & TRADE TERMS */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="currency-inr" size={16} color={activeTheme.primary} />
                <Text style={[styles.sectionLabel, { color: activeTheme.primary }]}>
                  Pricing & Trade Terms
                </Text>
              </View>

              <View style={styles.twoCol}>
                {/* Target Price */}
                <View style={[styles.fieldBlock, { flex: 1.2, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Target Price (₹)</Text>
                  <View style={styles.fieldWrapper}>
                    <Icon name="cash-multiple" size={16} color="#64748B" style={styles.fieldIcon} />
                    <TextInput
                      style={getInputStyle('targetPrice')}
                      placeholder="e.g. 2400"
                      keyboardType="numeric"
                      value={targetPrice}
                      onChangeText={setTargetPrice}
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('targetPrice')}
                      onBlur={() => setFocusedField(null)}
                      includeFontPadding={false}
                      textAlignVertical="center"
                    />
                  </View>
                </View>

                {/* Price Basis */}
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Price Basis</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dropdownSelectBtn]}
                    onPress={() => {
                      const idx = PRICE_UNITS.indexOf(priceUnit);
                      const nextIdx = (idx + 1) % PRICE_UNITS.length;
                      setPriceUnit(PRICE_UNITS[nextIdx]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownSelectText}>{priceUnit}</Text>
                    <Icon name="chevron-down" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Trade Type Pills (FOR vs EX-Warehouse) */}
              <View style={styles.unitBlock}>
                <Text style={styles.subFieldLabel}>Trade Type</Text>
                <View style={styles.unitRow}>
                  {TRADE_TYPES.map((typeOption) => {
                    const sel = tradeType === typeOption;
                    return (
                      <TouchableOpacity
                        key={typeOption}
                        onPress={() => setTradeType(typeOption)}
                        activeOpacity={0.75}
                        style={[
                          styles.unitChip,
                          sel
                            ? { backgroundColor: '#1E293B', borderColor: '#1E293B' }
                            : { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
                        ]}
                      >
                        <Icon
                          name={typeOption === 'FOR' ? 'truck-fast-outline' : 'warehouse'}
                          size={13}
                          color={sel ? '#FFFFFF' : '#64748B'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.unitChipText, { color: sel ? '#FFFFFF' : '#475569' }]}>
                          {typeOption}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* SECTION 3: LOGISTICS & PAYMENT */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="truck-delivery-outline" size={16} color={activeTheme.primary} />
                <Text style={[styles.sectionLabel, { color: activeTheme.primary }]}>
                  Logistics & Payment
                </Text>
              </View>

              {/* Delivery Location */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Delivery Location / Mandi</Text>
                <View style={styles.fieldWrapper}>
                  <Icon name="map-marker-outline" size={16} color="#64748B" style={styles.fieldIcon} />
                  <TextInput
                    style={getInputStyle('deliveryLocation')}
                    placeholder="e.g. Indore Mandi, MP"
                    value={deliveryLocation}
                    onChangeText={setDeliveryLocation}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setFocusedField('deliveryLocation')}
                    onBlur={() => setFocusedField(null)}
                    includeFontPadding={false}
                    textAlignVertical="center"
                  />
                </View>
              </View>

              {/* Payment Timeline Pills */}
              <View style={styles.unitBlock}>
                <Text style={styles.subFieldLabel}>Payment Timeline</Text>
                <View style={styles.timelineRow}>
                  {PAYMENT_TIMELINES.map((tl) => {
                    const sel = paymentTimeline === tl;
                    return (
                      <TouchableOpacity
                        key={tl}
                        onPress={() => setPaymentTimeline(tl)}
                        activeOpacity={0.75}
                        style={[
                          styles.timelineChip,
                          sel
                            ? { backgroundColor: activeTheme.primary + '18', borderColor: activeTheme.primary }
                            : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timelineChipText,
                            { color: sel ? activeTheme.primary : '#64748B' },
                          ]}
                        >
                          {tl}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* SECTION 4: QUALITY SPECS & DATES (OPTIONAL) */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="certificate-outline" size={16} color={activeTheme.primary} />
                <Text style={[styles.sectionLabel, { color: activeTheme.primary }]}>
                  Quality & Schedule (Optional)
                </Text>
              </View>

              <View style={styles.twoCol}>
                {/* Grade */}
                <View style={[styles.fieldBlock, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Grade</Text>
                  <View style={styles.fieldWrapper}>
                    <Icon name="star-outline" size={16} color="#64748B" style={styles.fieldIcon} />
                    <TextInput
                      style={getInputStyle('grade')}
                      placeholder="e.g. Grade A"
                      value={grade}
                      onChangeText={setGrade}
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('grade')}
                      onBlur={() => setFocusedField(null)}
                      includeFontPadding={false}
                      textAlignVertical="center"
                    />
                  </View>
                </View>

                {/* Moisture % */}
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Moisture %</Text>
                  <View style={styles.fieldWrapper}>
                    <Icon name="water-percent" size={16} color="#64748B" style={styles.fieldIcon} />
                    <TextInput
                      style={getInputStyle('moisture')}
                      placeholder="e.g. 12%"
                      keyboardType="numeric"
                      value={moisture}
                      onChangeText={setMoisture}
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('moisture')}
                      onBlur={() => setFocusedField(null)}
                      includeFontPadding={false}
                      textAlignVertical="center"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.twoCol}>
                {/* Harvest Year Picker */}
                <View style={[styles.fieldBlock, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Harvest Year</Text>
                  <TouchableOpacity
                    style={[getInputStyle('harvestYear'), styles.datePickerBtn]}
                    onPress={() => setIsHarvestPickerOpen(true)}
                    activeOpacity={0.75}
                  >
                    <Icon name="calendar-blank-outline" size={15} color="#64748B" style={{ marginRight: 4 }} />
                    <Text
                      style={[
                        styles.datePickerText,
                        harvestYear ? { color: '#0F172A' } : { color: '#94A3B8' },
                      ]}
                    >
                      {harvestYear || 'Year'}
                    </Text>
                    <Icon name="chevron-down" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Delivery Date Picker */}
                <View style={[styles.fieldBlock, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Expected Date</Text>
                  <TouchableOpacity
                    style={[getInputStyle('deliveryDate'), styles.datePickerBtn]}
                    onPress={() => setIsDeliveryPickerOpen(true)}
                    activeOpacity={0.75}
                  >
                    <Icon name="calendar-clock" size={15} color="#64748B" style={{ marginRight: 4 }} />
                    <Text
                      style={[
                        styles.datePickerText,
                        deliveryDate ? { color: '#0F172A' } : { color: '#94A3B8' },
                      ]}
                    >
                      {deliveryDate || 'Date'}
                    </Text>
                    <Icon name="chevron-down" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* SECTION 5: REMARKS */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="comment-text-outline" size={16} color={activeTheme.primary} />
                <Text style={[styles.sectionLabel, { color: activeTheme.primary }]}>
                  Additional Remarks
                </Text>
              </View>
              <View style={styles.fieldWrapper}>
                <TextInput
                  style={[getInputStyle('remarks'), styles.textArea]}
                  placeholder="Packaging details, moisture limits, or special terms..."
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  onFocus={() => setFocusedField('remarks')}
                  onBlur={() => setFocusedField(null)}
                  includeFontPadding={false}
                />
              </View>
            </View>

            {/* SUBMIT BUTTON */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: activeTheme.primary },
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="plus-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitText}>Post Requirement</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      <DatePicker
        modal
        open={isHarvestPickerOpen}
        date={
          harvestYear && /^\d{4}$/.test(harvestYear)
            ? new Date(Number(harvestYear), 0, 1)
            : new Date()
        }
        mode="date"
        theme="light"
        title="Select Harvest Year"
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={(date) => {
          setIsHarvestPickerOpen(false);
          setHarvestYear(String(date.getFullYear()));
        }}
        onCancel={() => setIsHarvestPickerOpen(false)}
      />

      <DatePicker
        modal
        open={isDeliveryPickerOpen}
        date={
          deliveryDate && !isNaN(new Date(deliveryDate).getTime())
            ? new Date(deliveryDate)
            : new Date()
        }
        minimumDate={new Date()}
        mode="date"
        theme="light"
        title="Select Delivery Date"
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={(date) => {
          setIsDeliveryPickerOpen(false);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          setDeliveryDate(`${yyyy}-${mm}-${dd}`);
        }}
        onCancel={() => setIsDeliveryPickerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '75%',
    maxHeight: '92%',
    paddingBottom: 16,
    elevation: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: { flex: 1 },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '800',
  },
  fieldBlock: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  subFieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 0,
    paddingHorizontal: 10,
    paddingLeft: 34,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  noIconInput: {
    paddingLeft: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginLeft: 2,
  },
  unitBlock: {
    marginTop: 2,
    marginBottom: 4,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitChip: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  timelineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timelineChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.2,
  },
  timelineChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  twoCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dropdownSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 8,
  },
  dropdownSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 8,
    paddingLeft: 12,
  },
  submitButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
