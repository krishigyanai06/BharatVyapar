import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoleSelectionScreen from '../../screen/auth/RoleSelectionScreen';
import SendOtp from '../../screen/auth/SendOtp';
import VerifyMobileOtp from '../../screen/auth/VerifyMobileOtp';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="SendOtp" component={SendOtp} />
      <Stack.Screen name="VerifyMobileOtp" component={VerifyMobileOtp} />
    </Stack.Navigator>
  );
};

export default AuthStack;
