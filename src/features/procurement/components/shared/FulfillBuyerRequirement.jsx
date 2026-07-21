import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DEFAULT_THEME = {
  primary: '#2E7D32',
  secondary: '#4CAF50',
  light: '#E8F5E9',
  text: '#1B5E20',
};

export default function FulfillBuyerRequirement({ visible, requirement, onClose, onSubmit, theme }) {
  const activeTheme = theme || DEFAULT_THEME;

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [dispatchTime, setDispatchTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (requirement) {
      setQuantity(String(requirement.remainingQuantity || requirement.quantity || ''));
      setPrice(String(requirement.expectedPrice || requirement.targetPrice || ''));
    }
  }, [requirement]);

  const getInputStyle = (fieldName) => [
    styles.input,
    focusedField === fieldName && { borderColor: activeTheme.primary, borderWidth: 1.5 },
  ];

  const handleSubmit = async () => {
    if (!quantity || !price) {
      Alert.alert('Validation Error', 'Please fill in quantity and price.');
      return;
    }

    const numericQty = Number(quantity);
    const numericPrice = Number(price);
    const maxQty = Number(requirement?.remainingQuantity || requirement?.quantity || 0);

    if (isNaN(numericQty) || numericQty <= 0) {
      Alert.alert('Invalid Quantity', 'Quantity must be greater than zero.');
      return;
    }

    if (maxQty > 0 && numericQty > maxQty) {
      Alert.alert(
        'Invalid Quantity',
        `Quantity cannot exceed remaining requirement of ${maxQty} ${requirement?.unit || 'Qt'}.`
      );
      return;
    }

    if (isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert('Invalid Price', 'Price must be greater than zero.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({ 
        requirementId: requirement?.id || requirement?._id,
        offeredQuantity: Number(quantity), 
        quotePrice: Number(price),
        offeredPrice: Number(price),
        dispatchTime,
        remarks,
      });
      setQuantity('');
      setPrice('');
      setDispatchTime('');
      setRemarks('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = quantity && price && !isNaN(Number(quantity)) && !isNaN(Number(price));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: activeTheme.primary }]}>Submit Quotation</Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.closeBtn}
              activeOpacity={0.8}
            >
              <Icon name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContainer}
          >
            {/* Requirement Context Card */}
            {requirement && (
              <View style={[styles.summaryCard, { backgroundColor: activeTheme.light, borderColor: activeTheme.primary + '20' }]}>
                <View style={styles.summaryTitleRow}>
                  <Text style={[styles.summaryCommodity, { color: activeTheme.text }]}>
                    {requirement.commodity}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: activeTheme.primary }]}>
                    <Text style={styles.badgeText}>{requirement.status || 'OPEN'}</Text>
                  </View>
                </View>
                <View style={styles.summaryMetaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Expected Price</Text>
                    <Text style={styles.metaVal}>₹{requirement.expectedPrice || requirement.targetPrice} / {requirement.unit || 'Quintal'}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Remaining Demand</Text>
                    <Text style={styles.metaVal}>{requirement.remainingQuantity || requirement.quantity} {requirement.unit || 'Quintal'}</Text>
                  </View>
                </View>
                {requirement.location ? (
                  <Text style={styles.summaryLoc}>
                    <Icon name="map-marker" size={13} color={activeTheme.primary} /> {requirement.location}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Inputs Section */}
            <Text style={[styles.sectionLabel, { color: activeTheme.primary }]}>QUOTATION DETAILS</Text>

            <View style={styles.fieldWrapper}>
              <Icon name="scale" size={16} color="#94A3B8" style={styles.fieldIcon} />
              <TextInput
                style={getInputStyle('quantity')}
                placeholder={`Offered Quantity (${requirement?.unit || 'Quintal'})`}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('quantity')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldWrapper}>
              <Icon name="currency-inr" size={16} color="#94A3B8" style={styles.fieldIcon} />
              <TextInput
                style={getInputStyle('price')}
                placeholder={`Quote Price per ${requirement?.unit || 'Quintal'}`}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldWrapper}>
              <Icon name="clock-outline" size={16} color="#94A3B8" style={styles.fieldIcon} />
              <TextInput
                style={getInputStyle('dispatchTime')}
                placeholder="Dispatch Timeline (e.g. 3 Days)"
                value={dispatchTime}
                onChangeText={setDispatchTime}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('dispatchTime')}
                onBlur={() => setFocusedField(null)}
              />
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
                placeholder="Additional comments (Optional)"
                value={remarks}
                onChangeText={setRemarks}
                maxLength={250}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onFocus={() => setFocusedField('remarks')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Submit Button */}
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
                  <Icon name="check-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>Submit Quotation</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    minHeight: '65%',
    maxHeight: '92%',
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    paddingBottom: 24,
  },
  summaryCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryCommodity: {
    fontSize: 17,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  summaryLoc: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: 12,
  },
  fieldIcon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
});
