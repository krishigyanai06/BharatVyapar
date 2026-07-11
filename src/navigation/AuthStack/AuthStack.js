import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoleSelectionScreen from '../../features/auth/screens/RoleSelectionScreen';
import SendOtp from '../../features/auth/screens/SendOtp';
import VerifyMobileOtp from '../../features/auth/screens/VerifyMobileOtp';


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
