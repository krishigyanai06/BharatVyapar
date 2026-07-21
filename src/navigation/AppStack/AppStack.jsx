import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import WarehouseScreen from '../../features/warehouse/screens/WarehouseScreen';

// New static screens for Marketplace & Trades flow
import CommodityDetailsScreen from '../../features/marketplace/screens/CommodityDetailsScreen';
import NegotiationDetailsScreen from '../../features/procurement/screens/NegotiationDetailsScreen';
import DealDetailsScreen from '../../features/procurement/screens/DealDetailsScreen';
import BuyerQuoteDashboard from '../../features/procurement/screens/BuyerQuoteDashboard';
import SellerOrdersScreen from '../../features/procurement/screens/SellerOrdersScreen';
import BuyerOrdersScreen from '../../features/procurement/screens/BuyerOrdersScreen';
import MyRequirementsScreen from '../../features/procurement/screens/MyRequirementsScreen';

const Stack = createNativeStackNavigator();

const SCREEN_OPTIONS = { headerShown: false };

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen name="WarehouseScreen" component={WarehouseScreen} />
      
      {/* Marketplace & Trades flows */}
      <Stack.Screen name="CommodityDetails" component={CommodityDetailsScreen} />
      <Stack.Screen name="NegotiationDetails" component={NegotiationDetailsScreen} />
      <Stack.Screen name="DealDetails" component={DealDetailsScreen} />
      <Stack.Screen name="BuyerQuoteDashboard" component={BuyerQuoteDashboard} />
      <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} />
      <Stack.Screen name="BuyerOrders" component={BuyerOrdersScreen} />
      <Stack.Screen name="MyRequirements" component={MyRequirementsScreen} />
    </Stack.Navigator>
  );
}
