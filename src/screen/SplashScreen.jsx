import React, { useEffect } from 'react';
import { View, Text, ImageBackground, StyleSheet, StatusBar, BackHandler, NativeModules } from 'react-native';
import Images from '../assets';
import COLORS from '../theme/colors';


const SplashScreen = ({ navigation, progress = 0 }) => {
  useEffect(() => {
    const activeNativeModules = NativeModules;

    // Hide system gesture/navigation bar on splash mount
    try {
      if (activeNativeModules?.SystemBar && typeof activeNativeModules.SystemBar.hide === 'function') {
        activeNativeModules.SystemBar.hide();
      }
    } catch (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
        console.warn('[SplashScreen] Failed to hide system navigation bar:', error);
      }
    }

    // Prevent hardware back button press during splash screen display
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    // Guard navigation timer to prevent crash when navigation is undefined
    let timer = null;
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test' && navigation && typeof navigation.replace === 'function') {
      timer = setTimeout(() => {
        navigation.replace('RoleSelection');
      }, 40000);
    }

    return () => {
      // Restore system gesture/navigation bar when exiting splash screen
      try {
        if (activeNativeModules?.SystemBar && typeof activeNativeModules.SystemBar.show === 'function') {
          activeNativeModules.SystemBar.show();
        }
      } catch (error) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
          console.warn('[SplashScreen] Failed to restore system navigation bar:', error);
        }
      }

      backHandler.remove();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <ImageBackground source={Images.splashScreen} style={styles.image} resizeMode="cover">
        
        {/* LOGO TEXT OVERLAY MASK */}
        <View style={styles.logoMaskContainer}>
          <View style={styles.logoTextRow}>
            <Text style={styles.greenLogoText}>Bharat </Text>
            <Text style={styles.orangeLogoText}>FPO</Text>
          </View>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.greenLogoText}>Vyapar</Text>
          <Text style={styles.subtext}>Kisan ki Mehnat, Desh ki Samriddhi</Text>
        </View>

        {/* BOTTOM LOADER OVERLAY MASK */}
        <View style={styles.bottomMaskContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.footerText}>Saath Milkar, Aage Badhenge</Text>
        </View>

      </ImageBackground>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.white 
  },
  image: { 
    flex: 1,
    width: '100%', 
    height: '100%' 
  },
  logoMaskContainer: {
    position: 'absolute',
    top: '41.5%', // Positioned to cover the logo text in the static image
    alignSelf: 'center',
    width: '95%',
    backgroundColor: '#FAFAF8', // Blends with the soft off-white background in the image
    alignItems: 'center',
    paddingVertical: 22,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenLogoText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#0F6938', // Dark green matching logo color
    letterSpacing: 0.5,
  },
  orangeLogoText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#F16F22', // Orange matching logo color
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    width: 140,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#0F6938',
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
    marginHorizontal: 8,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C3E2A',
    marginTop: 10,
    letterSpacing: 0.2,
  },
  bottomMaskContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 125,
    backgroundColor: COLORS.fpoPrimary, // Solid green matching the bottom area color
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 25,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  progressBarContainer: {
    width: '75%',
    height: 6,
    backgroundColor: '#1E3517', // Dark shade for progress track
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CB050', // Dynamic progress bar color
    borderRadius: 3,
  },
  footerText: {
    color: '#9EBF95', // Muted pastel green for footer text
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});