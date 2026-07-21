import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import NoInternetScreen from '../../screen/NoInternetScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const NetworkContext = createContext({ isConnected: true });

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL STATIC NETWORK STATUS
// client.js is a plain JS file — it cannot use React hooks or context.
// This module-level variable is the ONLY safe bridge between the React
// NetworkProvider and the Axios infrastructure layer.
// Updated synchronously whenever real or simulated connectivity changes.
// ─────────────────────────────────────────────────────────────────────────────
let _networkStatusStatic = true; // default: assume connected on boot
export const getNetworkStatusStatic = () => _networkStatusStatic;

// ─── DEV-ONLY: Simulate network off without turning off WiFi ───────────────
// __DEV__ = true only in debug builds, automatically false in production APK
let _devSimulateOffline = false;

export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  // DEV: simulated offline state (separate from real NetInfo state)
  const [devOffline, setDevOffline] = useState(false);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      // Treat null/undefined state as connected initially to avoid flashing on slow boots
      const status = state.isConnected !== false;
      setIsConnected(status);
    });

    return () => unsubscribe();
  }, []);

  const handleReconnect = async () => {
    // DEV: If simulating offline, just toggle it off
    if (__DEV__ && devOffline) {
      setDevOffline(false);
      return;
    }

    setIsChecking(true);
    try {
      // 1. Refresh NetInfo state
      const state = await NetInfo.refresh();
      if (state.isConnected === false) {
        setIsConnected(false);
        setIsChecking(false);
        return;
      }

      // 2. Perform a light ping to guarantee WAN internet access (resolves captive portals / dead routers)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('https://clients3.google.com/generate_204', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(timeoutId);

      if (response.status === 204 || response.ok) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (e) {
      console.warn('📶 [NetworkProvider] Reconnect check failed:', e);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Show NoInternet if: real network is down OR dev is simulating offline
  const showNoInternet = !isConnected || (__DEV__ && devOffline);
  const effectiveIsConnected = isConnected && !devOffline;

  const insets = useSafeAreaInsets();

  // Keep static variable in sync — used by client.js (outside React tree)
  _networkStatusStatic = effectiveIsConnected;

  return (
    <NetworkContext.Provider value={{ isConnected: effectiveIsConnected, isChecking, handleReconnect }}>
      <StatusBar hidden={showNoInternet} animated={true} />
      <View style={styles.container}>
        {/*
          SLICED OFFLINE WARNING BANNER (Approach 2)
          Premium, non-blocking notification bar showing cache status.
          Allows farmers to browse prices, bids, and listings without screen freezes.
          Dynamic padding top prevents notch or camera punch hole overlaps.
        */}
        {showNoInternet && (
          <View style={[
            styles.offlineBannerContainer, 
            { paddingTop: Math.max(insets.top, 12) } // Safeguard for physical notch height
          ]}>
            <View style={styles.offlineBanner}>
              <Icon name="wifi-strength-off" size={16} color="#FFFFFF" style={styles.offlineIcon} />
              <Text style={styles.offlineBannerText}>
                Offline. Check your connection to sync.
              </Text>
            </View>
          </View>
        )}

        {children}

        {/* ─── DEV-ONLY floating toggle button ─────────────────────────────
            Visible ONLY in debug builds (__DEV__ = false in production APK)
            Tap to simulate network off/on without touching WiFi
        ──────────────────────────────────────────────────────────────────── */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devToggle, devOffline && styles.devToggleActive]}
            onPress={() => setDevOffline(prev => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.devToggleText}>
              {devOffline ? '📵 NET OFF' : '📶 NET ON'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </NetworkContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─── OFFLINE BANNER STYLES ───────────────────────────────────────────────
  offlineBannerContainer: {
    backgroundColor: '#D97706', // Premium Amber/Orange
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineIcon: {
    marginRight: 8,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ─── DEV-ONLY styles — never ship to users ───────────────────────────────
  devToggle: {
    position: 'absolute',
    bottom: 90,        // above bottom tab bar
    right: 12,
    backgroundColor: '#1a1a2e',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    opacity: 0.85,
    elevation: 999,
    zIndex: 999,
  },
  devToggleActive: {
    backgroundColor: '#c0392b',  // Red when simulating offline
  },
  devToggleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export const useNetwork = () => useContext(NetworkContext);
