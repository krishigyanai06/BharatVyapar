import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { SafeScreen } from '../../../components/SafeScreen';
import AppHeader from '../../../components/AppHeader';
import COLORS from '../../../constant/colors';
import { w, h, f } from '../../../utils/responsive';
import { showAlert } from '../../../components/CustomAlertBox';

const ROLE_THEMES = {
  FPO: { primary: COLORS.fpoPrimary, secondary: COLORS.fpoSecondary, light: COLORS.fpoLight, text: COLORS.fpoText },
  Trader: { primary: COLORS.traderPrimary, secondary: COLORS.traderSecondary, light: COLORS.traderLight, text: COLORS.traderText },
  Miller: { primary: COLORS.millerPrimary, secondary: COLORS.millerSecondary, light: COLORS.millerLight, text: COLORS.millerText },
  Corporate: { primary: COLORS.corporatePrimary, secondary: COLORS.corporateSecondary, light: COLORS.corporateLight, text: COLORS.corporateText },
};

const INITIAL_OFFERS = [
  { id: '1', type: 'sell', crop: 'Wheat', variety: 'Lokwan', quantity: '50 MT', price: '2,400', location: 'Indore, MP', grade: 'A', moisture: '11%' },
  { id: '2', type: 'sell', crop: 'Soybean', variety: 'JS-335', quantity: '80 MT', price: '4,750', location: 'Ujjain, MP', grade: 'A', moisture: '10%' },
  { id: '3', type: 'buy', crop: 'Wheat', variety: 'Sharbati', quantity: '100 MT', price: '2,650', location: 'Bhopal, MP', grade: 'A+', moisture: '11.5%' },
  { id: '4', type: 'buy', crop: 'Chana', variety: 'Desi', quantity: '40 MT', price: '5,100', location: 'Kota, RJ', grade: 'B', moisture: '12%' },
  { id: '5', type: 'sell', crop: 'Mustard', variety: 'Pusa', quantity: '60 MT', price: '5,450', location: 'Alwar, RJ', grade: 'A', moisture: '9%' },
];

const CROPS = ['All', 'Wheat', 'Soybean', 'Chana', 'Mustard', 'Rice'];

export default function MarketplaceScreen() {
  const { user, selectedRole: stateRole } = useSelector(state => state.auth);
  const selectedRole = stateRole || user?.role || 'FPO';
  const theme = ROLE_THEMES[selectedRole] || ROLE_THEMES.FPO;

  const [activeTab, setActiveTab] = useState('sell'); // sell or buy
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [offers, setOffers] = useState(INITIAL_OFFERS);
  
  // Bidding states
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidQuantity, setBidQuantity] = useState('');

  // Post offer states
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [newCrop, setNewCrop] = useState('Wheat');
  const [newVariety, setNewVariety] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const filteredOffers = offers.filter(
    o => o.type === activeTab && (selectedCrop === 'All' || o.crop === selectedCrop)
  );

  const openBidModal = (offer) => {
    setSelectedOffer(offer);
    setBidPrice(offer.price);
    setBidQuantity(offer.quantity.split(' ')[0]);
    setBidModalVisible(true);
  };

  const handlePlaceBid = () => {
    if (!bidPrice || !bidQuantity) {
      showAlert({ type: 'error', title: 'Invalid Input', message: 'Please enter bid price and quantity.' });
      return;
    }
    setBidModalVisible(false);
    showAlert({
      type: 'success',
      title: 'Bid Submitted',
      message: `Your bid of ₹${bidPrice}/Qtl for ${bidQuantity} MT has been placed successfully!`,
    });
  };

  const handlePostOffer = () => {
    if (!newVariety || !newQty || !newPrice || !newLocation) {
      showAlert({ type: 'error', title: 'Missing Information', message: 'Please fill in all fields.' });
      return;
    }
    const newObj = {
      id: String(offers.length + 1),
      type: activeTab,
      crop: newCrop,
      variety: newVariety,
      quantity: `${newQty} MT`,
      price: newPrice,
      location: newLocation,
      grade: 'A',
      moisture: '12%',
    };
    setOffers([newObj, ...offers]);
    setPostModalVisible(false);
    
    // Reset inputs
    setNewVariety('');
    setNewQty('');
    setNewPrice('');
    setNewLocation('');

    showAlert({
      type: 'success',
      title: 'Offer Published',
      message: `Your ${activeTab === 'sell' ? 'sell listing' : 'buy requirement'} has been posted successfully!`,
    });
  };

  return (
    <SafeScreen style={{ backgroundColor: theme.light }} top={false} bottom={false}>
      <AppHeader
        backgroundColor={theme.primary}
        title="Agri Marketplace"
        subtitle="Trade crops at best market prices"
      />

      {/* Tabs Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sell' && styles.activeTabBorder]}
          onPress={() => { setActiveTab('sell'); setSelectedCrop('All'); }}
        >
          <Text style={[styles.tabText, activeTab === 'sell' && { color: theme.primary, fontWeight: '700' }]}>
            🌾 Crop Listings (Sell)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'buy' && styles.activeTabBorder]}
          onPress={() => { setActiveTab('buy'); setSelectedCrop('All'); }}
        >
          <Text style={[styles.tabText, activeTab === 'buy' && { color: theme.primary, fontWeight: '700' }]}>
            🛒 Buy Requirements
          </Text>
        </TouchableOpacity>
      </View>

      {/* Crop Filter Chips */}
      <View style={styles.chipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
          {CROPS.map((crop) => (
            <TouchableOpacity
              key={crop}
              style={[
                styles.chip,
                selectedCrop === crop && { backgroundColor: theme.primary },
              ]}
              onPress={() => setSelectedCrop(crop)}
            >
              <Text style={[styles.chipText, selectedCrop === crop && { color: COLORS.white }]}>
                {crop}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredOffers.length > 0 ? (
          filteredOffers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View>
                  <Text style={styles.offerCrop}>{offer.crop} ({offer.variety})</Text>
                  <Text style={styles.offerLocation}>📍 {offer.location}</Text>
                </View>
                <View style={[styles.gradeBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.gradeBadgeText, { color: theme.primary }]}>
                    Grade {offer.grade}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailVal}>{offer.quantity}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailVal}>₹{offer.price}/Qtl</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Moisture</Text>
                  <Text style={styles.detailVal}>{offer.moisture}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.bidButton, { backgroundColor: theme.primary }]}
                onPress={() => openBidModal(offer)}
                activeOpacity={0.8}
              >
                <Text style={styles.bidButtonText}>
                  {activeTab === 'sell' ? '🤝 Place Buy Bid' : '💰 Submit Sell Offer'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="store-alert-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No listings found for this crop category.</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setPostModalVisible(true)}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Bid Modal */}
      <Modal visible={bidModalVisible} transparent animationType="slide" onRequestClose={() => setBidModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Place Your Bid</Text>
            {selectedOffer && (
              <Text style={styles.modalSubtitle}>
                For {selectedOffer.crop} ({selectedOffer.variety}) in {selectedOffer.location}
              </Text>
            )}

            <Text style={styles.inputLabel}>Bid Price (₹/Qtl)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={bidPrice}
              onChangeText={setBidPrice}
              placeholder="e.g. 2450"
            />

            <Text style={styles.inputLabel}>Quantity (MT)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={bidQuantity}
              onChangeText={setBidQuantity}
              placeholder="e.g. 50"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setBidModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handlePlaceBid}
              >
                <Text style={styles.submitBtnText}>Submit Bid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post Offer Modal */}
      <Modal visible={postModalVisible} transparent animationType="slide" onRequestClose={() => setPostModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {activeTab === 'sell' ? 'Post Sell Listing' : 'Post Buy Requirement'}
            </Text>

            <Text style={styles.inputLabel}>Select Crop</Text>
            <View style={styles.dropdownSelector}>
              {['Wheat', 'Soybean', 'Chana', 'Mustard', 'Rice'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.dropdownChip, newCrop === c && { backgroundColor: theme.primary }]}
                  onPress={() => setNewCrop(c)}
                >
                  <Text style={[styles.dropdownChipText, newCrop === c && { color: COLORS.white }]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Variety</Text>
            <TextInput
              style={styles.modalInput}
              value={newVariety}
              onChangeText={setNewVariety}
              placeholder="e.g. Lokwan, Desi"
            />

            <Text style={styles.inputLabel}>Quantity (MT)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={newQty}
              onChangeText={setNewQty}
              placeholder="e.g. 50"
            />

            <Text style={styles.inputLabel}>Expected Price (₹/Qtl)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="e.g. 2500"
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.modalInput}
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="e.g. Indore, MP"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setPostModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handlePostOffer}
              >
                <Text style={styles.submitBtnText}>Post Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: h(14),
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabBorder: {
    borderBottomColor: COLORS.border,
  },
  tabText: {
    fontSize: f(13),
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  chipsWrapper: {
    backgroundColor: COLORS.white,
    paddingVertical: h(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  chipsContainer: {
    paddingHorizontal: w(16),
    gap: w(8),
  },
  chip: {
    paddingHorizontal: w(14),
    paddingVertical: h(6),
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
  },
  chipText: {
    fontSize: f(12),
    fontWeight: '600',
    color: COLORS.textLight,
  },
  listContent: {
    padding: w(16),
    paddingBottom: h(80),
  },
  offerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: h(12),
  },
  offerCrop: {
    fontSize: f(14),
    fontWeight: '700',
    color: COLORS.text,
  },
  offerLocation: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  gradeBadge: {
    paddingHorizontal: w(8),
    paddingVertical: h(3),
    borderRadius: 8,
  },
  gradeBadgeText: {
    fontWeight: '700',
    fontSize: f(11),
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: w(12),
    marginBottom: h(14),
  },
  detailCol: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginBottom: h(2),
  },
  detailVal: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  bidButton: {
    paddingVertical: h(10),
    borderRadius: 10,
    alignItems: 'center',
  },
  bidButtonText: {
    color: COLORS.white,
    fontSize: f(13),
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: h(60),
  },
  emptyText: {
    fontSize: f(13),
    color: COLORS.textMuted,
    marginTop: h(10),
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: h(16),
    right: w(16),
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: w(20),
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: w(20),
    elevation: 10,
  },
  modalTitle: {
    fontSize: f(16),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: h(4),
  },
  modalSubtitle: {
    fontSize: f(12),
    color: COLORS.textMuted,
    marginBottom: h(16),
  },
  inputLabel: {
    fontSize: f(12),
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: h(6),
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingVertical: h(10),
    paddingHorizontal: w(12),
    fontSize: f(14),
    color: COLORS.text,
    marginBottom: h(14),
  },
  modalActions: {
    flexDirection: 'row',
    gap: w(10),
    marginTop: h(10),
  },
  modalBtn: {
    flex: 1,
    paddingVertical: h(12),
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    backgroundColor: COLORS.white,
  },
  cancelBtnText: {
    color: COLORS.textLight,
    fontWeight: '700',
    fontSize: f(13),
  },
  submitBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(13),
  },
  dropdownSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: w(6),
    marginBottom: h(14),
  },
  dropdownChip: {
    paddingHorizontal: w(10),
    paddingVertical: h(6),
    borderRadius: 12,
    backgroundColor: '#F1F3F5',
  },
  dropdownChipText: {
    fontSize: f(11),
    fontWeight: '600',
    color: COLORS.textLight,
  },
});
