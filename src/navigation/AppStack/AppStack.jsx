import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import WarehouseScreen from '../../screen/app/WarehouseScreen';
import FinanceScreen from '../../screen/app/FinanceScreen';
import AryaShaktiScreen from '../../screen/app/AryaShaktiScreen';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen name="WarehouseScreen" component={WarehouseScreen} />
      <Stack.Screen name="FinanceScreen" component={FinanceScreen} />
      <Stack.Screen name="AryaShaktiScreen" component={AryaShaktiScreen} />
    </Stack.Navigator>
  );
}
