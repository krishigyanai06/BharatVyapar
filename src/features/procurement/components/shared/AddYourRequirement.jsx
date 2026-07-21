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

const UNITS = ['Ton', 'Quintal', 'Kg'];

const DEFAULT_THEME = {
  primary: '#2E7D32',
  secondary: '#4CAF50',
  light: '#E8F5E9',
  text: '#1B5E20',
};

export default function AddYourRequirement({ visible, onClose, onSubmit, theme }) {
  const activeTheme = theme || DEFAULT_THEME;

  const [commodity, setCommodity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Quintal');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [location, setLocation] = useState('');
  const [grade, setGrade] = useState('');
  const [moisture, setMoisture] = useState('');
  const [harvestYear, setHarvestYear] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isHarvestPickerOpen, setIsHarvestPickerOpen] = useState(false);
  const [isDeliveryPickerOpen, setIsDeliveryPickerOpen] = useState(false);

  const resetForm = () => {
    setCommodity('');
    setQuantity('');
    setUnit('Quintal');
    setExpectedPrice('');
    setLocation('');
    setGrade('');
    setMoisture('');
    setHarvestYear('');
    setDeliveryDate('');
    setRemarks('');
  };

  const handleSubmit = async () => {
    if (!commodity.trim() || !quantity || !expectedPrice || !location.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        commodity,
        quantity: Number(quantity),
        unit,
        expectedPrice: Number(expectedPrice),
        location,
        grade,
        moisture,
        harvestYear,
        deliveryDate,
        remarks,
      });
      resetForm();
      onClose();
    } catch (e) {
      console.error('[AddYourRequirement] Submit failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const isFormValid = !!(commodity.trim() && quantity && expectedPrice && location.trim());

  const getInputStyle = (field) => [
    styles.input,
    focusedField === field && { borderColor: activeTheme.primary, backgroundColor: '#FAFFFE' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={[styles.header, { borderBottomColor: activeTheme.primary + '20' }]}>
            <View style={[styles.headerIcon, { backgroundColor: activeTheme.primary + '15' }]}>
              <Icon name="clipboard-text-outline" size={20} color={activeTheme.primary} />
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>Post Requirement</Text>
              <Text style={styles.subtitle}>Tell sellers what you are looking for</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting} style={styles.closeBtn}>
              <Icon name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            <Text style={[styles.sectionLabel, { color: activeTheme.primary }]}>
              Commodity Details
            </Text>

            <View style={styles.fieldWrapper}>
              <Icon name="grain" size={16} color="#94A3B8" style={styles.fieldIcon} />
              <TextInput
                style={getInputStyle('commodity')}
                placeholder="Commodity (Wheat, Rice, Soybean...)"
                value={commodity}
                onChangeText={setCommodity}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('commodity')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldWrapper}>
              <Icon name="scale" size={16} color="#94A3B8" style={styles.fieldIcon} />
              <TextInput
                style={getInputStyle('quantity')}
                placeholder="Quantity"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('quantity')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.unitBlock}>
              <Text style={styles.unitLabel}>Unit</Text>
              <View style={styles.unitRow}>
                {UNITS.map((u) => {
                  const sel = unit === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setUnit(u)}
                      activeOpacity={0.75}
                      style={[
                        styles.unitChip,
                        sel
                          ? { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary }
                          : { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
                      ]}
                    >
                      <Text style={[styles.unitChipText, { color: sel ? '#FFFFFF' : '#64748B' }]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldWrapper}>
              <Icon name="currency-inr" size={16} color="#94A3B8" style={styles.fieldIcon} />
              <TextInput
                style={getInputStyle('price')}
                placeholder="Expected Price (per unit)"
                keyboardType="numeric"
                value={expectedPrice}
                onChangeText={setExpectedPrice}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldWrapper}>
              <Icon name="map-marker-outline" size={16} color="#94A3B8" style={styles.fieldIcon} />
              <TextInput
                style={getInputStyle('location')}
                placeholder="Delivery Location"
                value={location}
                onChangeText={setLocation}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('location')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Text style={[styles.sectionLabel, { color: activeTheme.primary, marginTop: 6 }]}>
              Quality and Timing (Optional)
            </Text>

            <View style={styles.twoCol}>
              <View style={[styles.fieldWrapper, { flex: 1, marginRight: 8 }]}>
                <Icon name="star-outline" size={16} color="#94A3B8" style={styles.fieldIcon} />
                <TextInput
                  style={getInputStyle('grade')}
                  placeholder="Grade"
                  value={grade}
                  onChangeText={setGrade}
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('grade')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <Icon name="water-percent" size={16} color="#94A3B8" style={styles.fieldIcon} />
                <TextInput
                  style={getInputStyle('moisture')}
                  placeholder="Moisture %"
                  keyboardType="numeric"
                  value={moisture}
                  onChangeText={setMoisture}
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('moisture')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.fieldWrapper, { flex: 1, marginRight: 8 }]}>
                <Icon name="calendar-blank-outline" size={16} color="#94A3B8" style={styles.fieldIcon} />
                <TouchableOpacity
                  style={[getInputStyle('harvestYear'), styles.datePickerBtn]}
                  onPress={() => setIsHarvestPickerOpen(true)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.datePickerText,
                      harvestYear ? { color: '#0F172A' } : { color: '#94A3B8' },
                    ]}
                  >
                    {harvestYear || 'Harvest Year'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <Icon name="truck-delivery-outline" size={16} color="#94A3B8" style={styles.fieldIcon} />
                <TouchableOpacity
                  style={[getInputStyle('deliveryDate'), styles.datePickerBtn]}
                  onPress={() => setIsDeliveryPickerOpen(true)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.datePickerText,
                      deliveryDate ? { color: '#0F172A' } : { color: '#94A3B8' },
                    ]}
                  >
                    {deliveryDate || 'Delivery Date'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldWrapper}>
              <Icon
                name="comment-text-outline"
                size={16}
                color="#94A3B8"
                style={[styles.fieldIcon, { alignSelf: 'flex-start', marginTop: 14 }]}
              />
              <TextInput
                style={[getInputStyle('remarks'), styles.textArea]}
                placeholder="Additional Remarks..."
                value={remarks}
                onChangeText={setRemarks}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onFocus={() => setFocusedField('remarks')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    isFormValid && !isSubmitting ? activeTheme.primary : '#CBD5E1',
                },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>Post Requirement</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Harvest Year Picker — date mode, extract year only */}
      <DatePicker
        modal
        open={isHarvestPickerOpen}
        date={(() => {
          if (harvestYear && /^\d{4}$/.test(harvestYear)) {
            return new Date(Number(harvestYear), 0, 1);
          }
          return new Date();
        })()}
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

      {/* Delivery Date Picker — full date */}
      <DatePicker
        modal
        open={isDeliveryPickerOpen}
        date={(() => {
          if (!deliveryDate) return new Date();
          const parsed = new Date(deliveryDate);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        })()}
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
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '70%',
    maxHeight: '92%',
    paddingBottom: 24,
    elevation: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 38,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    fontWeight: '500',
  },
  unitBlock: { marginBottom: 14 },
  unitLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitRow: { flexDirection: 'row', gap: 8 },
  unitChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipText: { fontSize: 13, fontWeight: '700' },
  twoCol: { flexDirection: 'row', marginBottom: 0 },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  datePickerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
