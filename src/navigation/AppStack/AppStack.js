import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '../../screen/app/HomeScreen';

const Stack = createNativeStackNavigator();

/**
 * Wrapper that adds SafeAreaView to screen
 * SafeAreaProvider is already in App.jsx, so we just use SafeAreaView
 */
const withSafeArea = (Screen) => {
  return function WrappedScreen(props) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Screen {...props} />
      </SafeAreaView>
    );
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={withSafeArea(HomeScreen)} />
    </Stack.Navigator>
  );
}