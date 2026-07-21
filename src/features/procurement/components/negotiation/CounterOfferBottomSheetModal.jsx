import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../../../theme/colors';

/**
 * CounterOfferBottomSheetModal
 * Pure Presentational Bottom Sheet Modal for Counter Offer Submission
 */
export function CounterOfferBottomSheetModal({
  visible,
  onClose,
  onSubmit,
  counterPrice,
  setCounterPrice,
  counterQty,
  setCounterQty,
  counterRemarks,
  setCounterRemarks,
  isFinalOfferToggle,
  setIsFinalOfferToggle,
  counterPriceError,
  submittingAction,
  theme,
  t,
  itemUnit = 'Quintal',
  currentPriceDisplay = '',
}) {
  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <Icon name="tag-outline" size={22} color={theme?.primary || COLORS.primary} />
              <Text style={[styles.headerTitle, { color: theme?.primary || COLORS.primary }]}>
                {t('Make Counter Offer')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color="#718096" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Price Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {t('Your Counter Price (\u20B9/{unit}) *').replace('{unit}', itemUnit)}
              </Text>
              <View style={[styles.inputWrapper, counterPriceError ? styles.inputErrorBorder : null]}>
                <Text style={styles.currencyPrefix}>\u20B9</Text>
                <TextInput
                  style={styles.textInput}
                  value={counterPrice}
                  onChangeText={setCounterPrice}
                  keyboardType="numeric"
                  placeholder={currentPriceDisplay ? `e.g. ${currentPriceDisplay}` : 'Enter amount'}
                  placeholderTextColor="#A0AEC0"
                />
              </View>
              {counterPriceError ? (
                <Text style={styles.errorText}>{counterPriceError}</Text>
              ) : null}
            </View>

            {/* Quantity Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {t('Quantity ({unit})').replace('{unit}', itemUnit)}
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={counterQty}
                  onChangeText={setCounterQty}
                  keyboardType="numeric"
                  placeholder="e.g. 50"
                  placeholderTextColor="#A0AEC0"
                />
              </View>
            </View>

            {/* Remarks Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('Remarks / Note (Optional)')}</Text>
              <View style={[styles.inputWrapper, { height: 75, alignItems: 'flex-start', paddingTop: 8 }]}>
                <TextInput
                  style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                  value={counterRemarks}
                  onChangeText={setCounterRemarks}
                  multiline={true}
                  placeholder={t('e.g. Final price including transport')}
                  placeholderTextColor="#A0AEC0"
                />
              </View>
            </View>

            {/* Final Offer Toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.toggleTitle}>{t('Mark as Final Offer')}</Text>
                <Text style={styles.toggleSubtitle}>{t('No further negotiations after this round')}</Text>
              </View>
              <Switch
                value={isFinalOfferToggle}
                onValueChange={setIsFinalOfferToggle}
                trackColor={{ false: '#CBD5E0', true: (theme?.primary || COLORS.primary) + '70' }}
                thumbColor={isFinalOfferToggle ? (theme?.primary || COLORS.primary) : '#F7FAFC'}
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submittingAction}>
              <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: theme?.primary || COLORS.primary },
                submittingAction ? { opacity: 0.7 } : null,
              ]}
              onPress={onSubmit}
              disabled={submittingAction}
            >
              {submittingAction ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{t('Submit Counter')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  formScroll: {
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    height: 46,
  },
  inputErrorBorder: {
    borderColor: '#E53E3E',
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    color: '#E53E3E',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  submitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
