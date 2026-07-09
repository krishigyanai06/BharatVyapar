import React from 'react';
import { Provider } from 'react-redux';
import store from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { CustomAlertBox } from './src/shared/components/CustomAlertBox';
import { NetworkProvider } from './src/shared/components/NetworkProvider';


export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        backgroundColor="#FFFFFF"
        barStyle="dark-content"
        translucent={false}
      />

      <Provider store={store}>
        <NetworkProvider>
          <CustomAlertBox />
          <RootNavigator />
        </NetworkProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
