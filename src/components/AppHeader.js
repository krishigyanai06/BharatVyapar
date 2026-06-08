import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from '../constant/colors';
import { w, h, f } from '../utils/responsive';

const AppHeader = ({
  backgroundColor,
  paddingTop,
  title,
  subtitle,
  children,
}) => {
  return (
    <View style={[styles.header, { backgroundColor, paddingTop }]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  header: {
    paddingBottom: h(20),
    paddingHorizontal: w(20),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: f(16),
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: f(32),
    fontWeight: '800',
    color: COLORS.white,
    marginTop: h(8),
    textAlign: 'center',
  },
});
