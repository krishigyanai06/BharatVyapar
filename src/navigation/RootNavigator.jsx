import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import {
  selectIsAuthenticated,
  selectIsAuthChecked,
  selectPendingNotificationRoute,
} from '../store/authSelectors';

import {
  checkStoredToken,
  clearAuth,
  clearPendingNotificationRoute,
} from '../store/authSlice';
import { initializeLanguageThunk } from '../store/languageSlice';
import { setUnauthorizedCallback } from '../api/client';

import SplashScreen from '../screen/SplashScreen';
import AuthStack from './AuthStack/AuthStack';
import AppStack from './AppStack/AppStack';

// Import our new decoupled navigation service controls
import {
  navigationRef,
  flushNavigationQueue,
  navigate,
} from './navigationService';

export default function RootNavigator() {
  const dispatch = useDispatch();
  // PERFORMANCE FIX: Three separate subscriptions instead of one whole-slice
  // selector. Each only re-renders RootNavigator when its specific field changes.
  const AUTH_CHECK_DELAY = 5500;
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAuthChecked   = useSelector(selectIsAuthChecked);
  const pendingRoute    = useSelector(selectPendingNotificationRoute);

  const [isLangInitialized, setIsLangInitialized] = useState(false);
  const [progress, setProgress] = useState(0);

  // Safe Post-Authentication Route Flusher Guard
  useEffect(() => {
    // Only route if user is fully logged in and auth checking has finished
    if (isAuthenticated && isAuthChecked && pendingRoute) {
      const { screen, params } = pendingRoute;
      console.log(`[RootNavigator] Processing pending notification route: ${screen}`);
      
      // Delay navigation by 500ms to allow AppStack loading layout and animations to settle
      const timer = setTimeout(() => {
        navigate(screen, params);
        dispatch(clearPendingNotificationRoute());
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isAuthChecked, pendingRoute, dispatch]);

  useEffect(() => {
    dispatch(initializeLanguageThunk())
      .unwrap()
      .catch(() => {})
      .finally(() => {
        setIsLangInitialized(true);
      });
  }, [dispatch]);

  useEffect(() => {
    // Small delay before checking token (skipped in Jest for instant setup and no leaks)
    const delay = (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') ? 0 : AUTH_CHECK_DELAY;
    const timer = setTimeout(() => {
      dispatch(checkStoredToken());
    }, delay);

    return () => clearTimeout(timer);
  }, [dispatch]);

  // Update progress state based on load stage
  useEffect(() => {
    if (isLangInitialized && progress < 0.3) {
      setProgress(0.3);
    }
  }, [isLangInitialized, progress]);

  useEffect(() => {
    if (!isLangInitialized || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')) return;

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
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        console.log('[RootNavigator] Navigation Container is ready. Flushing queue.');
        flushNavigationQueue();
      }}
    >
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
