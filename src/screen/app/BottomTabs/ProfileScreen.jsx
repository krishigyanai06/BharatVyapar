import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { SafeScreen } from '../../../components/SafeScreen';
import AppHeader from '../../../components/AppHeader';
import COLORS from '../../../constant/colors';
import { w, h, mw, f } from '../../../utils/responsive';
import { logoutUser } from '../../../store/authSlice'; // mock update if exists, or just local state
import { showAlert } from '../../../components/CustomAlertBox';

const ROLE_THEMES = {
  FPO: { primary: COLORS.fpoPrimary, secondary: COLORS.fpoSecondary, light: COLORS.fpoLight, text: COLORS.fpoText },
  Trader: { primary: COLORS.traderPrimary, secondary: COLORS.traderSecondary, light: COLORS.traderLight, text: COLORS.traderText },
  Miller: { primary: COLORS.millerPrimary, secondary: COLORS.millerSecondary, light: COLORS.millerLight, text: COLORS.millerText },
  Corporate: { primary: COLORS.corporatePrimary, secondary: COLORS.corporateSecondary, light: COLORS.corporateLight, text: COLORS.corporateText },
};

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { user, selectedRole: stateRole } = useSelector(state => state.auth);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  // Form Edit State
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState(user?.firstName || 'Vishal');
  const [lastName, setLastName] = useState(user?.lastName || 'Sutar');
  const [gender, setGender] = useState(user?.gender || 'Male');
  const [emailId, setEmailId] = useState(user?.emailId || 'vishal@example.com');
  const [phone] = useState(user?.phone || '9876543210');
  const [village, setVillage] = useState(user?.village || 'Rampur');
  const [district, setDistrict] = useState(user?.district || 'Dhar');
  const [state, setState] = useState(user?.state || 'Madhya Pradesh');

  // Documents Mock State
  const [profileImage, setProfileImage] = useState(null);
  const [shopLicense, setShopLicense] = useState(null);
  const [gstCertificate, setGstCertificate] = useState(null);
  const [panCard, setPanCard] = useState(null);

  const handleLogout = () => {
    showAlert({
      type: 'confirm',
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logoutUser());
          },
        },
      ],
    });
  };

  const handleSave = () => {
    if (!firstName || !lastName || !emailId || !phone || !village || !district || !state) {
      showAlert({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill all fields before saving.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    setIsEditing(false);
    showAlert({
      type: 'info',
      title: 'Profile Saved',
      message: 'Your profile fields have been updated successfully.',
      buttons: [{ text: 'Done' }],
    });
  };

  const simulateDocUpload = (docType) => {
    showAlert({
      type: 'confirm',
      title: 'Upload Document',
      message: `Would you like to simulate uploading a file for ${docType}?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload File',
          onPress: () => {
            const fileName = `${docType.toLowerCase().replace(' ', '_')}_uploaded.pdf`;
            if (docType === 'Profile Image') setProfileImage('https://via.placeholder.com/150');
            else if (docType === 'Shop License') setShopLicense(fileName);
            else if (docType === 'GST Certificate') setGstCertificate(fileName);
            else if (docType === 'PAN Card') setPanCard(fileName);

            showAlert({
              type: 'info',
              title: 'Upload Successful',
              message: `${docType} file has been mock uploaded.`,
              buttons: [{ text: 'OK' }],
            });
          },
        },
      ],
    });
  };

  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title="My Profile"
        subtitle={isEditing ? "Edit Account Details" : "Manage your account & preferences"}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Avatar & Header Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            onPress={() => isEditing && simulateDocUpload('Profile Image')} 
            activeOpacity={0.8}
            style={styles.avatarWrapper}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>
                  {firstName.substring(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            {isEditing && (
              <View style={[styles.avatarEditBadge, { backgroundColor: theme.secondary }]}>
                <Icon name="camera" size={14} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>
          <Text style={styles.profilePhone}>📞 +91 {phone}</Text>
          <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.roleBadgeText, { color: theme.primary }]}>
              Role: {selectedRole}
            </Text>
          </View>
        </View>

        {/* Profile Fields Sections */}
        <View style={styles.fieldsCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Profile Details</Text>
            <TouchableOpacity
              onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
              style={[styles.editBtn, { backgroundColor: theme.primary + '12' }]}
            >
              <Icon name={isEditing ? "check" : "pencil"} size={16} color={theme.primary} />
              <Text style={[styles.editBtnText, { color: theme.primary }]}>
                {isEditing ? "Save" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* First Name & Last Name */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.fieldLabel}>First Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldVal}>{firstName}</Text>
              )}
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldVal}>{lastName}</Text>
              )}
            </View>
          </View>

          {/* Gender */}
          <View style={styles.fullCol}>
            <Text style={styles.fieldLabel}>Gender</Text>
            {isEditing ? (
              <View style={styles.genderPicker}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.genderChip,
                      gender === g && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                  >
                    <Text style={[styles.genderChipText, gender === g && { color: COLORS.white }]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.fieldVal}>{gender}</Text>
            )}
          </View>

          {/* Phone & Email */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.fieldLabel}>Phone</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, styles.disabledInput]}
                  value={phone}
                  editable={false}
                  placeholder="Phone"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldVal}>{phone}</Text>
              )}
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.fieldLabel}>Email ID</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={emailId}
                  onChangeText={setEmailId}
                  placeholder="Email"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                />
              ) : (
                <Text style={styles.fieldVal}>{emailId}</Text>
              )}
            </View>
          </View>

          {/* Village, District & State */}
          <View style={styles.row}>
            <View style={styles.thirdCol}>
              <Text style={styles.fieldLabel}>Village</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={village}
                  onChangeText={setVillage}
                  placeholder="Village"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldVal}>{village}</Text>
              )}
            </View>
            <View style={styles.thirdCol}>
              <Text style={styles.fieldLabel}>District</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={district}
                  onChangeText={setDistrict}
                  placeholder="District"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldVal}>{district}</Text>
              )}
            </View>
            <View style={styles.thirdCol}>
              <Text style={styles.fieldLabel}>State</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldVal}>{state}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Documents Section */}
        <View style={styles.fieldsCard}>
          <Text style={[styles.sectionTitle, { color: theme.primary, marginBottom: h(12) }]}>
            Documents & KYC
          </Text>

          {/* Shop License */}
          <View style={styles.docRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docLabel}>Shop License</Text>
              <Text style={styles.docStatus}>
                {shopLicense ? `📎 ${shopLicense}` : "❌ Not Uploaded"}
              </Text>
            </View>
            {isEditing && (
              <TouchableOpacity
                onPress={() => simulateDocUpload('Shop License')}
                style={[styles.uploadBtn, { borderColor: theme.primary }]}
              >
                <Icon name="upload" size={14} color={theme.primary} />
                <Text style={[styles.uploadBtnText, { color: theme.primary }]}>Upload</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* GST Certificate */}
          <View style={styles.docRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docLabel}>GST Certificate</Text>
              <Text style={styles.docStatus}>
                {gstCertificate ? `📎 ${gstCertificate}` : "❌ Not Uploaded"}
              </Text>
            </View>
            {isEditing && (
              <TouchableOpacity
                onPress={() => simulateDocUpload('GST Certificate')}
                style={[styles.uploadBtn, { borderColor: theme.primary }]}
              >
                <Icon name="upload" size={14} color={theme.primary} />
                <Text style={[styles.uploadBtnText, { color: theme.primary }]}>Upload</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* PAN Card */}
          <View style={styles.docRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docLabel}>PAN Card</Text>
              <Text style={styles.docStatus}>
                {panCard ? `📎 ${panCard}` : "❌ Not Uploaded"}
              </Text>
            </View>
            {isEditing && (
              <TouchableOpacity
                onPress={() => simulateDocUpload('PAN Card')}
                style={[styles.uploadBtn, { borderColor: theme.primary }]}
              >
                <Icon name="upload" size={14} color={theme.primary} />
                <Text style={[styles.uploadBtnText, { color: theme.primary }]}>Upload</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: theme.primary }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Icon name="logout" size={20} color={theme.primary} />
          <Text style={[styles.logoutText, { color: theme.primary }]}>Logout Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: w(16),
    paddingBottom: h(30),
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(20),
    alignItems: 'center',
    marginBottom: h(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: h(12),
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    fontSize: f(26),
    color: COLORS.white,
    fontWeight: '800',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  profileName: {
    fontSize: f(16),
    fontWeight: '700',
    color: COLORS.text,
  },
  profilePhone: {
    fontSize: f(12),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  roleBadge: {
    marginTop: h(10),
    paddingHorizontal: w(12),
    paddingVertical: h(4),
    borderRadius: 12,
  },
  roleBadgeText: {
    fontWeight: '700',
    fontSize: f(12),
  },
  fieldsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: h(14),
  },
  sectionTitle: {
    fontSize: f(15),
    fontWeight: '800',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: w(12),
    paddingVertical: h(6),
    borderRadius: mw(12),
    gap: w(4),
  },
  editBtnText: {
    fontSize: f(11),
    fontWeight: '700',
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
  fullCol: {
    marginBottom: h(14),
  },
  fieldLabel: {
    fontSize: f(10),
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: h(4),
  },
  fieldVal: {
    fontSize: f(13),
    color: COLORS.text,
    fontWeight: '600',
    paddingVertical: h(6),
  },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: mw(8),
    paddingHorizontal: w(10),
    height: h(36),
    fontSize: f(13),
    color: COLORS.text,
    backgroundColor: '#F8F9FA',
  },
  disabledInput: {
    backgroundColor: '#E9ECEF',
    color: COLORS.textMuted,
  },
  genderPicker: {
    flexDirection: 'row',
    gap: w(8),
    marginTop: h(2),
  },
  genderChip: {
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: mw(8),
    paddingHorizontal: w(12),
    paddingVertical: h(6),
  },
  genderChipText: {
    fontSize: f(12),
    color: COLORS.textLight,
    fontWeight: '600',
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: h(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  docLabel: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.text,
  },
  docStatus: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: mw(8),
    paddingHorizontal: w(10),
    paddingVertical: h(6),
    gap: w(4),
  },
  uploadBtnText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: h(14),
    backgroundColor: COLORS.white,
    gap: w(8),
    marginTop: h(10),
  },
  logoutText: {
    fontSize: f(14),
    fontWeight: '700',
  },
});
