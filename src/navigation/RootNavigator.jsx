import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { selectIsAuthenticated, selectIsAuthChecked } from '../store/authSelectors';

import { checkStoredToken, clearAuth } from '../store/authSlice';
import { initializeLanguageThunk } from '../store/languageSlice';
import { setUnauthorizedCallback } from '../api/client';


import SplashScreen from '../screen/SplashScreen';
import AuthStack from './AuthStack/AuthStack';
import AppStack from './AppStack/AppStack';

export default function RootNavigator() {
  const dispatch = useDispatch();
  // PERFORMANCE FIX: Three separate subscriptions instead of one whole-slice
  // selector. Each only re-renders RootNavigator when its specific field changes.
  const AUTH_CHECK_DELAY = 5500;
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAuthChecked   = useSelector(selectIsAuthChecked);

  const [isLangInitialized, setIsLangInitialized] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    dispatch(initializeLanguageThunk())
      .unwrap()
      .catch(() => {})
      .finally(() => {
        setIsLangInitialized(true);
      });
  }, [dispatch]);

  useEffect(() => {
    // Small delay before checking token
    const timer = setTimeout(() => {
      dispatch(checkStoredToken());
    }, AUTH_CHECK_DELAY);

    return () => clearTimeout(timer);
  }, [dispatch]);

  // Update progress state based on load stage
  useEffect(() => {
    if (isLangInitialized && progress < 0.3) {
      setProgress(0.3);
    }
  }, [isLangInitialized, progress]);

  useEffect(() => {
    if (!isLangInitialized) return;

    const intervalTime = 100;
    const totalSteps = AUTH_CHECK_DELAY / intervalTime;
    const stepSize = 0.6 / totalSteps;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 0.9) {
          clearInterval(progressInterval);
          return prev;
        }
        return Math.min(prev + stepSize, 0.9);
      });
    }, intervalTime);

    return () => clearInterval(progressInterval);
  }, [isLangInitialized]);

  useEffect(() => {
    if (isAuthChecked) {
      setProgress(1.0);
    }
  }, [isAuthChecked]);

  useEffect(() => {
    setUnauthorizedCallback(() => {
      dispatch(clearAuth());
    });

    return () => {
      setUnauthorizedCallback(null);
    };
  }, [dispatch]);

  if (!isAuthChecked || !isLangInitialized) {
    return <SplashScreen progress={progress} />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
