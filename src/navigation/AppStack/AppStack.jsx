import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import WarehouseScreen from '../../features/warehouse/screens/WarehouseScreen';
import FinanceScreen from '../../features/finance/screens/FinanceScreen';

// New static screens for Marketplace & Trades flow
import CommodityDetailsScreen from '../../features/marketplace/screens/CommodityDetailsScreen';
import NegotiationDetailsScreen from '../../features/orders/screens/NegotiationDetailsScreen';
import DealDetailsScreen from '../../features/orders/screens/DealDetailsScreen';
import BuyerQuoteDashboard from '../../features/orders/screens/BuyerQuoteDashboard';
import SellerOrdersScreen from '../../features/orders/screens/SellerOrdersScreen';
import BuyerOrdersScreen from '../../features/orders/screens/BuyerOrdersScreen';

const Stack = createNativeStackNavigator();

const SCREEN_OPTIONS = { headerShown: false };

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen name="WarehouseScreen" component={WarehouseScreen} />
      <Stack.Screen name="FinanceScreen" component={FinanceScreen} />
      
      {/* Marketplace & Trades flows */}
      <Stack.Screen name="CommodityDetails" component={CommodityDetailsScreen} />
      <Stack.Screen name="NegotiationDetails" component={NegotiationDetailsScreen} />
      <Stack.Screen name="DealDetails" component={DealDetailsScreen} />
      <Stack.Screen name="BuyerQuoteDashboard" component={BuyerQuoteDashboard} />
      <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} />
      <Stack.Screen name="BuyerOrders" component={BuyerOrdersScreen} />
    </Stack.Navigator>
  );
}
