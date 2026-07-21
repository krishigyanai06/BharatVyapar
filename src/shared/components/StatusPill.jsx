import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStatusBadgeConfig } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';
import { f, w, h } from '../utils/responsive';

/**
 * StatusPill — Design System Component
 * Renders status badges (Pending, Rejected, Countered, etc.) with standardized colors.
 * Wraps translation and color contracts inside one reusable badge.
 */
export const StatusPill = ({ status, containerStyle, textStyle, ...props }) => {
  const { t } = useTranslation();
  const { label, color, bg } = getStatusBadgeConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: bg }, containerStyle]} {...props}>
      <Text style={[styles.text, { color }, textStyle]}>
        {t(label)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    paddingHorizontal: w(8),
    paddingVertical: h(4),
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '800',
    fontSize: f(11),
    textAlign: 'center',
  },
});

export default StatusPill;
