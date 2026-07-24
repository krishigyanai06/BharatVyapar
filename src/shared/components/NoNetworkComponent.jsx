import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Material Design 3 Tokens (extracted from HTML design spec)
const M3_COLORS = {
  background: '#f9f9ff',
  surface: '#f9f9ff',
  onSurface: '#111c2d',
  onSurfaceVariant: '#454651',
  primary: '#142175',
  onPrimary: '#ffffff',
  surfaceContainerHigh: '#dee8ff',
  outline: '#767682',
};

const DEFAULT_ILLUSTRATION =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAf9H2p_Flat3mOIwi2nh679ymwvw5KIrxB-P2aZNMrd_sJmkN427zN7hwy5fa3m9Lq180JFPTh98EEeayf9N3jSx4A4vzccUmXlVoZyMCNFcjv5Mj5ZdbIvl3uDkT68WopMD9XvaUSSV9f3af_r_dbo94uJwbI6Yn4YDdLWwGVVAMXyjs61t00x457XzG5r-TuG5cHB-1ljwGJJvw_Gc2l59zccYL9MUeca8ZiaWSZmsKe04Xeb7um';

const NoNetworkComponent = ({
  onRetry,
  isRetrying = false,
  retryMessage = '',
  showSettingsButton = true,
  title = 'Connection Lost',
  subtitle = 'It looks like you’re offline. Please check your Wi-Fi or data connection to keep exploring.',
  illustrationUrl = DEFAULT_ILLUSTRATION,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Clamped responsive sizing
  const circleSize = Math.min(width * 0.7, 280);
  const imageSize = Math.min(width * 0.48, 192);

  // Rotation Animation Controller for Retry Button
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;
    if (isRetrying) {
      spinAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      spinAnim.setValue(0);
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isRetrying, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleOpenSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.WIRELESS_SETTINGS');
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      Linking.openSettings().catch(() => {});
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 16, 32),
          paddingBottom: Math.max(insets.bottom + 16, 24),
        },
      ]}
    >
      <View style={styles.mainContent}>
        {/* Illustration Soft Circle Container */}
        <View style={styles.illustrationWrapper}>
          <View
            style={[
              styles.softCircle,
              { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
            ]}
          />
          <Image
            source={{ uri: illustrationUrl }}
            style={{ width: imageSize, height: imageSize }}
            resizeMode="contain"
          />
        </View>

        {/* M3 Typography */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* M3 Primary Filled Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isRetrying && styles.buttonDisabled]}
            onPress={onRetry}
            disabled={isRetrying}
            activeOpacity={0.85}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Icon name="refresh" size={20} color={M3_COLORS.onPrimary} />
            </Animated.View>
            <Text style={styles.primaryButtonText}>
              {isRetrying ? 'Checking...' : 'Try Again'}
            </Text>
          </TouchableOpacity>

          {/* M3 Outlined Button */}
          {showSettingsButton && (
            <TouchableOpacity
              style={styles.outlinedButton}
              onPress={handleOpenSettings}
              activeOpacity={0.85}
            >
              <Text style={styles.outlinedButtonText}>Network Settings</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Retry Feedback Message */}
        {!!retryMessage && (
          <View style={styles.messageContainer}>
            <Text style={styles.retryMessageText}>{retryMessage}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default NoNetworkComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M3_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  softCircle: {
    position: 'absolute',
    backgroundColor: M3_COLORS.surfaceContainerHigh,
    opacity: 0.6,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: M3_COLORS.onSurface,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: M3_COLORS.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 300,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: M3_COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: M3_COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  outlinedButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: M3_COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedButtonText: {
    color: M3_COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  messageContainer: {
    height: 40,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryMessageText: {
    fontSize: 14,
    color: M3_COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
});
