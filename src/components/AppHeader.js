import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constant/colors';
import { w, h, f } from '../utils/responsive';

const AppHeader = ({
  backgroundColor,
  paddingTop,
  title,
  subtitle,
  children,
  showBackButton,
  onBackPress,
}) => {
  return (
    <View style={[styles.header, { backgroundColor, paddingTop }]}>
      <View style={styles.headerTopRow}>
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} style={styles.backButton} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
        {title && (
          <Text 
            style={[
              styles.title, 
              showBackButton && { textAlign: 'left', marginLeft: w(8) }
            ]}
          >
            {title}
          </Text>
        )}
      </View>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: h(10),
  },
  backButton: {
    padding: w(4),
  },
  title: {
    fontSize: f(16),
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: f(26),
    fontWeight: '800',
    color: COLORS.white,
    marginTop: h(8),
    textAlign: 'center',
  },
});

