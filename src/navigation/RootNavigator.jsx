import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { selectAuthToken, selectUser, selectIsAuthChecked } from '../store/authSelectors';

import { checkStoredToken, clearAuth } from '../store/authSlice';
import { setUnauthorizedCallback } from '../service/api';

import SplashScreen from '../screen/SplashScreen';
import AuthStack from './AuthStack/AuthStack';
import AppStack from './AppStack/AppStack';

export default function RootNavigator() {
  const dispatch = useDispatch();
  // PERFORMANCE FIX: Three separate subscriptions instead of one whole-slice
  // selector. Each only re-renders RootNavigator when its specific field changes.
  const token         = useSelector(selectAuthToken);
  const user          = useSelector(selectUser);
  const isAuthChecked = useSelector(selectIsAuthChecked);

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
