import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import NoNetworkComponent from './NoNetworkComponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NetworkContext = createContext({
  isConnected: true,
  isChecking: false,
  showBlockingModal: false,
  handleReconnect: () => {},
  triggerOfflineModal: () => {},
  dismissOfflineModal: () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL STATIC NETWORK STATUS & OFFLINE BLOCK CALLBACK
// client.js and CustomAlertBox are plain JS/singletons outside the React Context tree.
// ─────────────────────────────────────────────────────────────────────────────
let _networkStatusStatic = true;
export const getNetworkStatusStatic = () => _networkStatusStatic;

let _offlineBlockCallback = null;
export const setOfflineBlockCallback = (cb) => {
  _offlineBlockCallback = cb;
};
export const triggerOfflineBlockGlobal = () => {
  if (_offlineBlockCallback) {
    _offlineBlockCallback();
  }
};


export const NetworkProvider = ({ children }) => {
  // ── 1. ALL REACT HOOKS GROUPED STRICTLY AT TOP LEVEL ─────────────────────
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [showBlockingModal, setShowBlockingModal] = useState(false);
  const [devOffline, setDevOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setOfflineBlockCallback(() => setShowBlockingModal(true));

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const status = state.isConnected !== false;
      setIsConnected(status);
      _networkStatusStatic = status;
      if (status) {
        setShowBlockingModal(false);
      }
    });

    return () => {
      setOfflineBlockCallback(null);
      unsubscribe();
    };
  }, []);


  // ── 2. HELPER HANDLERS (DEFINED AFTER HOOKS) ─────────────────────────────
  const triggerOfflineModal = () => {
    setShowBlockingModal(true);
  };

  const dismissOfflineModal = () => {
    setShowBlockingModal(false);
  };

  const handleReconnect = async () => {
    // Reset DEV simulated offline mode
    if (__DEV__ && devOffline) {
      setDevOffline(false);
    }

    setIsChecking(true);
    try {
      // 1. Axios Ping: Tracked & logged directly in Chrome DevTools Network Tab!
      const response = await axios.get('https://clients3.google.com/generate_204', {
        timeout: 5000,
        headers: { 'Cache-Control': 'no-cache' },
      });


      if (response.status === 204 || response.status === 200 || response.ok) {
        setIsConnected(true);
        _networkStatusStatic = true;
        setShowBlockingModal(false);
      } else {
        setIsConnected(false);
        _networkStatusStatic = false;
      }
    } catch (e) {
      console.warn('📶 [NetworkProvider] Reconnect Axios ping failed:', e?.message || e);
      setIsConnected(false);
      _networkStatusStatic = false;
    } finally {
      setIsChecking(false);
    }
  };



  // Show banner if real network is down OR dev is simulating offline
  const showNoInternet = !isConnected || (__DEV__ && devOffline);
  const effectiveIsConnected = isConnected && !devOffline;

  // Keep static variable in sync for client.js
  _networkStatusStatic = effectiveIsConnected;

  return (
    <NetworkContext.Provider
      value={{
        isConnected: effectiveIsConnected,
        isChecking,
        showBlockingModal,
        handleReconnect,
        triggerOfflineModal,
        dismissOfflineModal,
      }}
    >
      <StatusBar hidden={showNoInternet || showBlockingModal} animated={true} />
      <View style={styles.container}>
        {/*
          APPROACH 1: NON-BLOCKING TOP AMBER BANNER (GET Browsing)
          Allows users to browse cached prices, bids, and listings without screen freezes.
        */}
        {showNoInternet && !showBlockingModal && (
          <View
            style={[
              styles.offlineBannerContainer,
              { paddingTop: Math.max(insets.top, 12) },
            ]}
          >
            <View style={styles.offlineBanner}>
              <Icon name="wifi-strength-off" size={16} color="#FFFFFF" style={styles.offlineIcon} />
              <Text style={styles.offlineBannerText}>
                Offline. Check your connection to sync.
              </Text>
            </View>
          </View>
        )}

        {children}

        {/*
          APPROACH 2: FULL-SCREEN BLOCKING MODAL (Critical Write Attempts)
          Triggered when un-synced write calls fail offline.
        */}
        <Modal
          visible={showBlockingModal}
          animationType="slide"
          transparent={false}
          statusBarTranslucent={true}
          onRequestClose={dismissOfflineModal}
        >
          <NoNetworkComponent
            onRetry={handleReconnect}
            isRetrying={isChecking}
            showSettingsButton={true}
          />
        </Modal>

        {/* DEV-ONLY floating toggle button */}
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
  offlineBannerContainer: {
    backgroundColor: '#D97706',
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
  devToggle: {
    position: 'absolute',
    bottom: 90,
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
    backgroundColor: '#c0392b',
  },
  devToggleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export const useNetwork = () => useContext(NetworkContext);
