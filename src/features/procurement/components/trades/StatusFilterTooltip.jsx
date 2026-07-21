import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../../../theme/colors';
import { w, h, f } from '../../../../shared/utils/responsive';
import { useTranslation } from '../../../../shared/hooks/useTranslation';

export default function StatusFilterTooltip({ visible, onClose, theme }) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={[styles.tooltipCard, { borderColor: theme.primary + '30' }]}
          activeOpacity={1}
        >
          <View style={styles.tooltipHeader}>
            <Icon name="information" size={18} color={theme.primary} />
            <Text style={[styles.tooltipTitle, { color: theme.primary }]}>{t('Status Filter Guide')}</Text>
          </View>
          <View style={styles.tooltipDivider} />
          
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipIconBg, { backgroundColor: '#EDF2F7' }]}>
              <Icon name="clock-outline" size={15} color="#718096" />
            </View>
            <View style={styles.tooltipTextCol}>
              <Text style={styles.tooltipItemLabel}>{t('Active')}</Text>
              <Text style={styles.tooltipItemDesc}>
                {t('Ongoing deals, counter-offers, or listings awaiting response.')}
              </Text>
            </View>
          </View>

          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipIconBg, { backgroundColor: '#FAF5FF' }]}>
              <Icon name="swap-horizontal" size={15} color="#6B46C1" />
            </View>
            <View style={styles.tooltipTextCol}>
              <Text style={styles.tooltipItemLabel}>{t('In Negotiation')}</Text>
              <Text style={styles.tooltipItemDesc}>
                {t('Only bids under active price counter-negotiations.')}
              </Text>
            </View>
          </View>

          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipIconBg, { backgroundColor: '#F0FFF4' }]}>
              <Icon name="check-decagram" size={15} color="#38A169" />
            </View>
            <View style={styles.tooltipTextCol}>
              <Text style={styles.tooltipItemLabel}>{t('Accepted')}</Text>
              <Text style={styles.tooltipItemDesc}>
                {t('Deals finalized and closed successfully between buyer & seller.')}
              </Text>
            </View>
          </View>

          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipIconBg, { backgroundColor: '#FFF5F5' }]}>
              <Icon name="close-circle-outline" size={15} color="#E53E3E" />
            </View>
            <View style={styles.tooltipTextCol}>
              <Text style={styles.tooltipItemLabel}>{t('Closed')}</Text>
              <Text style={styles.tooltipItemDesc}>
                {t('Bids or listings that have expired, been rejected, or cancelled.')}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.tooltipCloseBtn, { backgroundColor: theme.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.tooltipCloseText}>{t('Got it')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: w(20),
  },
  tooltipCard: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: w(18),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
  },
  tooltipTitle: {
    fontSize: f(14),
    fontWeight: '800',
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: h(12),
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: w(10),
    marginBottom: h(14),
  },
  tooltipIconBg: {
    width: w(28),
    height: w(28),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipTextCol: {
    flex: 1,
    gap: h(2),
  },
  tooltipItemLabel: {
    fontSize: f(12.5),
    fontWeight: '800',
    color: '#1E293B',
  },
  tooltipItemDesc: {
    fontSize: f(11),
    color: '#64748B',
    lineHeight: h(15),
    fontWeight: '500',
  },
  tooltipCloseBtn: {
    borderRadius: 8,
    paddingVertical: h(10),
    alignItems: 'center',
    marginTop: h(6),
  },
  tooltipCloseText: {
    color: '#FFFFFF',
    fontSize: f(13),
    fontWeight: '800',
  },
});
