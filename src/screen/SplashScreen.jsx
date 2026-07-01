import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar, BackHandler, NativeModules } from 'react-native';
import Images from '../assets';
import COLORS from '../constant/colors';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    // Hide system gesture/navigation bar on splash mount
    try {
      if (NativeModules.SystemBar && typeof NativeModules.SystemBar.hide === 'function') {
        NativeModules.SystemBar.hide();
      }
    } catch (error) {
      console.warn('[SplashScreen] Failed to hide system navigation bar:', error);
    }

    // Prevent hardware back button press during splash screen display
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    // Guard navigation timer to prevent crash when navigation is undefined
    let timer = null;
    if (navigation && typeof navigation.replace === 'function') {
      timer = setTimeout(() => {
        navigation.replace('RoleSelection');
      }, 4000);
    }

    return () => {
      // Restore system gesture/navigation bar when exiting splash screen
      try {
        if (NativeModules.SystemBar && typeof NativeModules.SystemBar.show === 'function') {
          NativeModules.SystemBar.show();
        }
      } catch (error) {
        console.warn('[SplashScreen] Failed to restore system navigation bar:', error);
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
      <Image source={Images.splashScreen} style={styles.image} resizeMode="cover" />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.white 
  },
  image: { 
    width: '100%', 
    height: '100%' 
  },
});