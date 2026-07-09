import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import COLORS from '../constant/colors';
import Images from '../assets';
import { f } from '../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NoInternetScreen = ({ isChecking, onReconnect }) => {
  // useWindowDimensions — screen rotate ya foldable device pe bhi sahi size milti hai
  const { width, height } = useWindowDimensions();

  const isSmallScreen = height < 640;
  const imageSize    = Math.min(width * 0.55, 220);  // max 220, but scales down on small screens
  const buttonWidth  = Math.min(width * 0.55, 220);  // responsive button width

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" translucent={false} />

      <View style={[styles.content, { paddingHorizontal: width * 0.06 }]}>

        {/* Illustration */}
        <View style={[styles.imageContainer, { width: imageSize, height: imageSize }]}>
          <Image
            source={Images.noInternet}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>
          Whoops!
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, isSmallScreen && styles.subtitleSmall]}>
          There seems to be a problem with your{'\n'}Network Connection
        </Text>

        {/* Retry Button */}
        <TouchableOpacity
          style={[
            styles.button,
            { minWidth: buttonWidth },
            isChecking && styles.buttonDisabled,
          ]}
          onPress={onReconnect}
          disabled={isChecking}
          activeOpacity={0.8}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <View style={styles.buttonContent}>
              <Icon name="refresh" size={f(20)} color={COLORS.white} />
              <Text style={styles.buttonText}>Try Reconnecting</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NoInternetScreen;

const styles = StyleSheet.create({
  /* 
    flex: 1 here works because Modal gives us a full-screen root View.
    No absoluteFillObject needed — Modal itself is full-screen native layer.
  */
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: f(30),
    fontWeight: 'bold',
    color: '#3182CE',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: f(24),
  },
  subtitle: {
    fontSize: f(15),
    color: COLORS.textLight,
    lineHeight: f(22),
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '500',
  },
  subtitleSmall: {
    fontSize: f(13),
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3182CE',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    height: 50,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: f(15),
    fontWeight: '700',
  },
});
