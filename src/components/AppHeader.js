import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../constant/colors';
import { w, h, f } from '../utils/responsive';

/**
 * AppHeader
 *
 * Props:
 *  - backgroundColor  {string}   Header bg color (required)
 *  - title            {string}   Bold screen title (centered)
 *  - subtitle         {string}   Light descriptive line below title
 *  - showBackButton   {bool|null}
 *       null (default) → auto-detects: shows back button if navigation.canGoBack() is true.
 *       true           → always show (even on a stack root).
 *       false          → always hide (use on tab-root screens).
 *  - onBackPress      {fn}       Custom back handler; falls back to navigation.goBack()
 *  - rightAction      {object}   Optional right icon: { icon, onPress, label }
 *  - children         {node}     Rendered below the title row (e.g. search bars)
 */
const AppHeader = ({
  backgroundColor,
  title,
  subtitle,
  children,
  showBackButton = null,   // null = auto-detect via canGoBack()
  onBackPress,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Auto-detect: if caller didn't explicitly set showBackButton,
  // show the button only when the navigator actually has a screen to go back to.
  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBackButton === null ? canGoBack : showBackButton;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (canGoBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.header, { backgroundColor, paddingTop: insets.top }]}>
      <View style={styles.headerTopRow}>

        {/* ── Left: Back Button or spacer ─────────────────────────── */}
        {shouldShowBack ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.sideBtn}
            activeOpacity={0.75}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Navigates to the previous screen"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.iconCircle}>
              <Icon name="arrow-left" size={f(20)} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.sideSlot} />
        )}

        {/* ── Centre: Title + Subtitle ─────────────────────────────── */}
        <View style={styles.textContainer}>
          {title ? (
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* ── Right: Custom action or balancing spacer ─────────────── */}
        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.sideBtn}
            activeOpacity={0.75}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={rightAction.label || 'Action'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[styles.iconCircle, styles.iconCircleRight]}>
              <Icon
                name={rightAction.icon || 'dots-vertical'}
                size={f(20)}
                color={COLORS.white}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.sideSlot} />
        )}

      </View>

      {children}
    </View>
  );
};

export default AppHeader;

const BTN = 36; // px — fixed size, NOT w() so width === height === borderRadius*2 always

const styles = StyleSheet.create({
  header: {
    paddingBottom: h(18),
    paddingHorizontal: w(14),
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: h(8),
    minHeight: h(44),
  },

  // ── Side slots ────────────────────────────────────────────────────────────
  sideBtn: {
    width: BTN,
    height: BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSlot: {
    width: BTN,
    height: BTN,
  },

  // ── Back / Right icon circle ──────────────────────────────────────────────
  iconCircle: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,                        // perfect circle always
    backgroundColor: 'rgba(255, 255, 255, 0.22)', // visible frosted glass
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',      // subtle white ring
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Title / Subtitle ──────────────────────────────────────────────────────
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: w(6),
  },
  title: {
    fontSize: f(17),
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: f(12),
    fontWeight: '400',
    color: COLORS.white,
    opacity: 0.82,
    marginTop: h(3),
    textAlign: 'center',
    lineHeight: h(17),
  },
});

