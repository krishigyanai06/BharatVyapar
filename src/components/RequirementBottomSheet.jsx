import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';

export default function RequirementBottomSheet({ visible, onClose, onSubmit }) {
  const [commodity, setCommodity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Qt');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [location, setLocation] = useState('');
  const [grade, setGrade] = useState('');
  const [moisture, setMoisture] = useState('');
  const [harvestYear, setHarvestYear] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!commodity || !quantity || !unit || !expectedPrice || !location) return;
    
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
      setCommodity('');
      setQuantity('');
      setUnit('Qt');
      setExpectedPrice('');
      setLocation('');
      setGrade('');
      setMoisture('');
      setHarvestYear('');
      setDeliveryDate('');
      setRemarks('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Post New Requirement</Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Commodity (e.g. Wheat, Rice)"
              value={commodity}
              onChangeText={setCommodity}
              placeholderTextColor="#999"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Quantity"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Unit"
                value={unit}
                onChangeText={setUnit}
                placeholderTextColor="#999"
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Expected Price (per unit)"
              keyboardType="numeric"
              value={expectedPrice}
              onChangeText={setExpectedPrice}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor="#999"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Grade"
                value={grade}
                onChangeText={setGrade}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Moisture"
                value={moisture}
                onChangeText={setMoisture}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Harvest Year"
                keyboardType="numeric"
                value={harvestYear}
                onChangeText={setHarvestYear}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                placeholder="Delivery Date"
                value={deliveryDate}
                onChangeText={setDeliveryDate}
                placeholderTextColor="#999"
              />
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Remarks"
              value={remarks}
              onChangeText={setRemarks}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit Requirement</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeText: {
    color: '#007bff',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
