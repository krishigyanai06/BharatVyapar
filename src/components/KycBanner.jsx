import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constant/colors';
import { w, h, mw, f } from '../utils/responsive';
import userApi from '../service/user/userApi';
import { getUserDetails } from '../store/authSlice';
import { showAlert } from './CustomAlertBox';
import { ROLE_THEMES } from '../service/user/userService';
import { selectUser, selectSelectedRole } from '../store/authSelectors';

const validatePan = (pan) => {
  if (!pan) return 'PAN number is required';
  const cleanPan = pan.trim().toUpperCase();
  if (cleanPan.length !== 10) return 'PAN must be exactly 10 characters';
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(cleanPan)) return 'Invalid PAN format (e.g. ABCDE1234F)';
  return null;
};

const validateKycName = (name) => {
  if (!name) return 'Name as per PAN card is required';
  const cleanName = name.trim();
  if (cleanName.length < 3) return 'Name must be at least 3 characters';
  if (/[<>"'`&]/.test(cleanName)) return 'Name contains invalid characters';
  return null;
};

export default function KycBanner({ actionType = 'trade', style }) {
  const dispatch = useDispatch();
  // PERFORMANCE FIX: Two granular selectors — KycBanner only re-renders when
  // user or selectedRole change, not on any unrelated auth state update.
  const user      = useSelector(selectUser);
  const stateRole = useSelector(selectSelectedRole);

  const [kycModalVisible, setKycModalVisible] = useState(false);
  const [kycForm, setKycForm]                 = useState({ pan: '', name: '' });
  const [kycErrors, setKycErrors]             = useState({});
  const [kycLoading, setKycLoading]           = useState(false);
  const [focusedField, setFocusedField]       = useState(null);

  // If already verified, do not show the banner
  if (user?.kycStatus === 'VERIFIED') {
    return null;
  }

  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  // Custom warning messages based on context
  const getBannerMessage = () => {
    switch (actionType) {
      case 'sell':
        return 'KYC Pending! You must complete PAN verification before listing or selling commodities.';
      case 'buy':
        return 'KYC Pending! You must complete PAN verification before making offers or buying commodities.';
      default:
        return 'KYC Pending! Complete PAN verification to unlock buy and sell operations.';
    }
  };

  const handleKycSubmit = async () => {
    const panErr = validatePan(kycForm.pan);
    const nameErr = validateKycName(kycForm.name);

    if (panErr || nameErr) {
      setKycErrors({ pan: panErr, name: nameErr });
      return;
    }

    try {
      setKycLoading(true);
      await userApi.verifyPan({ pan: kycForm.pan, name: kycForm.name });

      showAlert({
        type: 'info',
        title: 'KYC Verified',
        message: 'Your PAN details have been successfully verified.',
        buttons: [{ text: 'OK' }],
      });

      await dispatch(getUserDetails());
      setKycModalVisible(false);
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'KYC Verification Failed',
        message: error?.message || 'Failed to verify PAN. Please ensure details are correct.',
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setKycLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.bannerRow}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '10' }]}>
          <Icon name="shield-alert-outline" size={20} color={theme.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle}>KYC Verification Required</Text>
          <Text style={styles.bannerMessage}>{getBannerMessage()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.verifyBtn, { backgroundColor: theme.primary }]}
          onPress={() => {
            setKycForm({ pan: '', name: '' });
            setKycErrors({});
            setKycModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyBtnText}>Verify</Text>
        </TouchableOpacity>
      </View>

      {/* Reusable KYC Bottom Sheet Modal */}
      <Modal
        visible={kycModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!kycLoading) setKycModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            {/* Native Drag Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Verify PAN Card</Text>
                <Text style={styles.modalSubTitleText}>Instantly verify identity using NSDL registry</Text>
              </View>
              <TouchableOpacity
                onPress={() => setKycModalVisible(false)}
                disabled={kycLoading}
                style={styles.closeBtn}
              >
                <Icon name="close" size={18} color="#718096" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Trust Badge */}
              <View style={styles.trustBadge}>
                <Icon name="shield-check" size={16} color="#319795" />
                <Text style={styles.trustBadgeText}>Income Tax Department Database Integration</Text>
              </View>

              <View style={styles.fullCol}>
                <Text style={styles.fieldLabel}>PAN Cardholder Name</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'name' && { borderColor: theme.primary, backgroundColor: COLORS.white },
                  kycErrors.name && styles.inputErrorContainer
                ]}>
                  <Icon 
                    name="account-box-outline" 
                    size={20} 
                    color={focusedField === 'name' ? theme.primary : '#A0AEC0'} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={styles.textInputStyle}
                    value={kycForm.name}
                    onChangeText={(v) => {
                      setKycForm((prev) => ({ ...prev, name: v }));
                      setKycErrors((prev) => ({ ...prev, name: validateKycName(v) }));
                    }}
                    placeholder="Enter full name as on PAN card"
                    placeholderTextColor="#A0AEC0"
                    autoCapitalize="words"
                    editable={!kycLoading}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                {kycErrors.name && <Text style={styles.errorText}>{kycErrors.name}</Text>}
              </View>

              <View style={styles.fullCol}>
                <Text style={styles.fieldLabel}>PAN Number</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'pan' && { borderColor: theme.primary, backgroundColor: COLORS.white },
                  kycErrors.pan && styles.inputErrorContainer
                ]}>
                  <Icon 
                    name="card-account-details-outline" 
                    size={20} 
                    color={focusedField === 'pan' ? theme.primary : '#A0AEC0'} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={styles.textInputStyle}
                    value={kycForm.pan}
                    onChangeText={(v) => {
                      const uppercaseVal = v.toUpperCase();
                      setKycForm((prev) => ({ ...prev, pan: uppercaseVal }));
                      setKycErrors((prev) => ({ ...prev, pan: validatePan(uppercaseVal) }));
                    }}
                    placeholder="e.g. ABCDE1234F"
                    placeholderTextColor="#A0AEC0"
                    autoCapitalize="characters"
                    maxLength={10}
                    editable={!kycLoading}
                    onFocus={() => setFocusedField('pan')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                {kycErrors.pan && <Text style={styles.errorText}>{kycErrors.pan}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, styles.kycSubmitBtn, { backgroundColor: theme.primary }]}
                onPress={handleKycSubmit}
                disabled={kycLoading}
                activeOpacity={0.85}
              >
                {kycLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Icon name="shield-check" size={20} color={COLORS.white} />
                )}
                <Text style={styles.saveBtnText}>
                  {kycLoading ? 'Verifying PAN...' : 'Verify & Submit'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.termsNote}>
                Your security is our priority. PAN details are transmitted securely using high-grade encryption and are not stored permanently.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBF9', // Sophisticated soft warm background
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E', // Left accent color
    borderRadius: mw(14),
    paddingVertical: h(12),
    paddingHorizontal: w(14),
    margin: w(12),
    elevation: 3,
    shadowColor: '#1A202C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(12),
  },
  iconContainer: {
    width: w(36),
    height: w(36),
    borderRadius: mw(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: f(13),
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: h(2),
  },
  bannerMessage: {
    fontSize: f(11),
    color: '#4A5568',
    fontWeight: '600',
    lineHeight: h(15),
  },
  verifyBtn: {
    paddingHorizontal: w(16),
    paddingVertical: h(8),
    borderRadius: mw(10),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  verifyBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(11),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: mw(32),
    borderTopRightRadius: mw(32),
    overflow: 'hidden',
    maxHeight: '92%',
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  modalHandle: {
    width: w(44),
    height: h(5),
    backgroundColor: '#E2E8F0',
    borderRadius: mw(3),
    alignSelf: 'center',
    marginTop: h(10),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: w(24),
    paddingTop: h(16),
    paddingBottom: h(12),
    borderBottomWidth: 1,
    borderColor: '#EDF2F7',
  },
  modalTitle: {
    fontSize: f(20),
    fontWeight: '800',
    color: '#1A202C',
    letterSpacing: 0.2,
  },
  modalSubTitleText: {
    fontSize: f(12),
    color: '#718096',
    marginTop: h(2),
    fontWeight: '600',
  },
  closeBtn: {
    padding: w(6),
    backgroundColor: '#F7FAFC',
    borderRadius: mw(18),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBody: {
    padding: w(24),
    paddingBottom: h(40),
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(49, 151, 149, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(49, 151, 149, 0.2)',
    borderRadius: mw(10),
    paddingVertical: h(8),
    paddingHorizontal: w(12),
    marginBottom: h(20),
    gap: w(6),
  },
  trustBadgeText: {
    fontSize: f(11),
    fontWeight: '800',
    color: '#234E52',
    letterSpacing: 0.2,
  },
  fullCol: {
    marginBottom: h(18),
  },
  fieldLabel: {
    fontSize: f(11),
    fontWeight: '800',
    color: '#718096',
    marginBottom: h(6),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: mw(14),
    paddingHorizontal: w(14),
    height: h(48),
    backgroundColor: '#F7FAFC',
  },
  inputIcon: {
    marginRight: w(10),
  },
  textInputStyle: {
    flex: 1,
    height: '100%',
    fontSize: f(14),
    color: '#2D3748',
    fontWeight: '600',
  },
  inputErrorContainer: {
    borderColor: '#FC8181',
    backgroundColor: '#FFF5F5',
  },
  inputError: {
    // legacy fallback
  },
  errorText: {
    fontSize: f(11),
    color: '#E53E3E',
    fontWeight: '700',
    marginTop: h(4),
    marginLeft: w(4),
  },
  saveBtn: {
    borderRadius: mw(16),
    paddingVertical: h(16),
    alignItems: 'center',
    marginTop: h(10),
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  saveBtnText: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  kycSubmitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: w(8),
  },
  termsNote: {
    fontSize: f(10),
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: h(20),
    lineHeight: h(14),
    fontWeight: '500',
  },
});
