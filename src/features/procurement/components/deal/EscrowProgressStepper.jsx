import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../../../theme/colors';
import { w, h, f } from '../../../../shared/utils/responsive';

// Format date display helper
function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EscrowProgressStepper({
  escrowStatus,
  deal,
  STAGES,
  theme,
  t,
  isCancelled,
  currentStageIdx,
  stageTimestamps,
}) {
  return (
    <View style={styles.stepperContainer}>
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>
        {t('Escrow & Logistics Progress')}
      </Text>

      {STAGES.map((stage, idx) => {
        const isCompleted = !isCancelled && idx < currentStageIdx;
        const isActive    = !isCancelled && idx === currentStageIdx;
        const isFuture    = idx > currentStageIdx;
        const ts          = stageTimestamps[stage.key];

        let iconName  = 'checkbox-blank-circle-outline';
        let iconColor = COLORS.textMuted;
        if (isCancelled && idx === currentStageIdx) {
          iconName  = 'close-circle';
          iconColor = COLORS.error;
        } else if (isCompleted) {
          iconName  = 'check-circle';
          iconColor = COLORS.success;
        } else if (isActive) {
          iconName  = 'circle-slice-8';
          iconColor = theme.primary;
        }

        return (
          <View key={stage.key} style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              <Icon name={iconName} size={22} color={iconColor} />
              {idx < STAGES.length - 1 && (
                <View style={[styles.stepLine, isCompleted ? styles.stepLineCompleted : styles.stepLinePending]} />
              )}
            </View>
            <View style={[styles.stepContent, isActive && styles.activeStepContent]}>
              <Text style={[
                styles.stepTitle,
                isActive     && styles.activeStepTitle,
                isActive     && { color: theme.primary },
                isCompleted  && styles.completedStepTitle,
                isFuture     && styles.futureStepTitle,
              ]}>
                {t(stage.title)}
              </Text>
              <Text style={styles.stepDesc}>{t(stage.desc)}</Text>
              {ts ? (
                <Text style={styles.stepTimestamp}>✓ {formatDate(ts)}</Text>
              ) : (
                isActive && <Text style={styles.stepPending}>{t('Pending action...')}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stepperContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: w(16),
    marginBottom: h(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: f(14),
    fontWeight: '800',
    marginBottom: h(16),
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: h(4),
  },
  stepIndicator: {
    alignItems: 'center',
    width: w(30),
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: h(4),
    minHeight: h(24),
  },
  stepLineCompleted: {
    backgroundColor: COLORS.success,
  },
  stepLinePending: {
    backgroundColor: '#E9ECEF',
  },
  stepContent: {
    flex: 1,
    paddingBottom: h(16),
    paddingHorizontal: w(10),
    borderRadius: 8,
    marginBottom: h(2),
  },
  activeStepContent: {
    backgroundColor: '#F8F9FA',
  },
  stepTitle: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  activeStepTitle: {
    fontWeight: '800',
  },
  completedStepTitle: {
    color: COLORS.text,
  },
  futureStepTitle: {
    color: COLORS.textMuted,
  },
  stepDesc: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
    lineHeight: h(14),
  },
  stepTimestamp: {
    fontSize: f(10),
    color: COLORS.success,
    marginTop: h(3),
    fontWeight: '600',
  },
  stepPending: {
    fontSize: f(10),
    color: COLORS.textMuted,
    marginTop: h(3),
    fontStyle: 'italic',
  },
});
