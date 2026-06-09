import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';

import { checkStoredToken, clearAuth } from '../store/authSlice';
import { setUnauthorizedCallback } from '../service/api';

import SplashScreen from '../screen/SplashScreen';
import AuthStack from './AuthStack/AuthStack';
import AppStack from './AppStack/AppStack';

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { token, user, isAuthChecked } = useSelector(state => state.auth);

  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    // Small delay before checking token
    const timer = setTimeout(() => {
      dispatch(checkStoredToken());
    }, 1500);

    return () => clearTimeout(timer);
  }, [dispatch]);

  useEffect(() => {
    setUnauthorizedCallback(() => {
      dispatch(clearAuth());
    });

    return () => {
      setUnauthorizedCallback(null);
    };
  }, [dispatch]);

  if (!isAuthChecked) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
