import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import NoInternetScreen from '../../screen/NoInternetScreen';


const NetworkContext = createContext({ isConnected: true });

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

  return (
    <NetworkContext.Provider value={{ isConnected, isChecking, handleReconnect }}>
      <View style={styles.container}>
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

      {/*
        Modal renders at the NATIVE layer — completely outside the React navigation
        zIndex stacking context. This ensures it covers:
          - Bottom tab bar
          - Status bar (via statusBarTranslucent)
          - All screens, headers, and overlays
      */}
      <Modal
        visible={showNoInternet}
        transparent={false}
        animationType="fade"
        statusBarTranslucent={true}
        hardwareAccelerated={true}
        onRequestClose={() => {}}
      >
        <NoInternetScreen isChecking={isChecking} onReconnect={handleReconnect} />
      </Modal>
    </NetworkContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
