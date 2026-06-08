import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar, BackHandler } from 'react-native';
import Images from '../assets';
import COLORS from '../constant/colors';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    // Prevent back button during splash
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    
    // Navigate after 4 seconds
    const timer = setTimeout(() => {
      navigation.replace('RoleSelection');
    }, 4000);

    return () => {
      backHandler.remove();
      clearTimeout(timer);
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