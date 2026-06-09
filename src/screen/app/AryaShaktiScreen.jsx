import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constant/colors';
import { w, h, mw, f } from '../../utils/responsive';
import { showAlert } from '../../components/CustomAlertBox';
import { SafeScreen } from '../../components/SafeScreen';

const WEATHER_FORECAST = [
  { day: 'Today', temp: '32°C', icon: 'weather-sunny', cond: 'Sunny' },
  { day: 'Tue', temp: '31°C', icon: 'weather-partly-cloudy', cond: 'Partly Cloudy' },
  { day: 'Wed', temp: '29°C', icon: 'weather-pouring', cond: 'Rain Showers' },
  { day: 'Thu', temp: '30°C', icon: 'weather-lightning-rainy', cond: 'Thunderstorm' },
];

const ADVISORIES = [
  {
    id: '1',
    title: 'Pest Risk Alert',
    desc: 'High humidity detected. Increased risk of Soybean Stem Borer. Spray Chlorantraniliprole 18.5 SC (80ml/acre) if infestation exceeds 5%.',
    severity: 'high',
  },
  {
    id: '2',
    title: 'Irrigation Advisory',
    desc: 'Light rain expected on Wednesday. Postpone planned irrigation by 48 hours to conserve water and prevent waterlogging.',
    severity: 'medium',
  },
];

export default function AryaShaktiScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useSelector(state => state.auth);
  const selectedRole = user?.role || 'FPO';
  const roleColor = {
    FPO: COLORS.fpoPrimary,
    Trader: COLORS.traderPrimary,
    Miller: COLORS.millerPrimary,
    Corporate: COLORS.corporatePrimary,
  }[selectedRole] || COLORS.fpoPrimary;

  const [activeFarm, setActiveFarm] = useState('Indore Block A');
  const [scanning, setScanning] = useState(false);
  const [ndviValue, setNdviValue] = useState(0.72);

  const startSatelliteScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const randomNdvi = (0.6 + Math.random() * 0.35).toFixed(2);
      setNdviValue(parseFloat(randomNdvi));
      showAlert({
        type: 'info',
        title: 'Satellite Scan Complete',
        message: `NDVI index for ${activeFarm} updated. Current crop vigor is ${randomNdvi} (Healthy Vegetation).`,
        buttons: [{ text: 'View Report', style: 'default' }],
      });
    }, 2500);
  };

  return (
    <SafeScreen style={styles.container} top={false} bottom={true}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColor, paddingTop: insets.top + h(10) }]}>
        <Text style={styles.headerTitle}>Arya Shakti AI</Text>
        <Text style={styles.headerSubtitle}>Satellite farm health, weather & crop intelligence</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Farm Selector */}
        <View style={styles.farmSelectorRow}>
          <TouchableOpacity
            style={[styles.farmTab, activeFarm === 'Indore Block A' && { borderColor: roleColor, backgroundColor: roleColor + '08' }]}
            onPress={() => {
              setActiveFarm('Indore Block A');
              setNdviValue(0.72);
            }}
          >
            <Text style={[styles.farmTabText, activeFarm === 'Indore Block A' && { color: roleColor, fontWeight: '700' }]}>
              Indore Block A (Soybean)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.farmTab, activeFarm === 'Jaipur North' && { borderColor: roleColor, backgroundColor: roleColor + '08' }]}
            onPress={() => {
              setActiveFarm('Jaipur North');
              setNdviValue(0.58);
            }}
          >
            <Text style={[styles.farmTabText, activeFarm === 'Jaipur North' && { color: roleColor, fontWeight: '700' }]}>
              Jaipur North (Mustard)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mock NDVI Satellite Heatmap */}
        <View style={styles.satelliteCard}>
          <Text style={styles.satelliteTitle}>Live NDVI Health Map</Text>
          <Text style={styles.satelliteTime}>Last Scanned: 4 hours ago | Resolution: 10m</Text>

          {/* Heatmap Visual Grid */}
          <View style={styles.mapGridContainer}>
            <View style={styles.mapGrid}>
              {/* Row 1 */}
              <View style={[styles.mapCell, { backgroundColor: '#38A169' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#38A169' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#48BB78' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#ECC94B' }]} />
              {/* Row 2 */}
              <View style={[styles.mapCell, { backgroundColor: '#38A169' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#48BB78' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#ECC94B' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#E53E3E' }]} />
              {/* Row 3 */}
              <View style={[styles.mapCell, { backgroundColor: '#48BB78' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#ECC94B' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#E53E3E' }]} />
              <View style={[styles.mapCell, { backgroundColor: '#E53E3E' }]} />
            </View>

            {/* Scale legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#E53E3E' }]} />
                <Text style={styles.legendText}>Stressed (&lt;0.3)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#ECC94B' }]} />
                <Text style={styles.legendText}>Moderate (0.3 - 0.6)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#38A169' }]} />
                <Text style={styles.legendText}>Healthy (&gt;0.6)</Text>
              </View>
            </View>
          </View>

          {/* Current NDVI value */}
          <View style={styles.ndviSummaryBox}>
            <View>
              <Text style={styles.ndviLabel}>Average NDVI Index</Text>
              <Text style={[styles.ndviValue, { color: ndviValue > 0.6 ? COLORS.success : '#D97706' }]}>
                {ndviValue}
              </Text>
            </View>
            <View style={[styles.healthIndicatorBadge, { backgroundColor: ndviValue > 0.6 ? '#E6F4EA' : '#FEF3C7' }]}>
              <Text style={[styles.healthIndicatorText, { color: ndviValue > 0.6 ? '#137333' : '#D97706' }]}>
                {ndviValue > 0.6 ? 'Good Vigor' : 'Mild Stress'}
              </Text>
            </View>
          </View>

          {/* Scan button */}
          <TouchableOpacity
            onPress={startSatelliteScan}
            style={[styles.scanButton, { backgroundColor: roleColor }]}
            disabled={scanning}
          >
            {scanning ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Icon name="radar" size={20} color={COLORS.white} />
                <Text style={styles.scanButtonText}>Trigger Satellite Health Scan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Weather Card */}
        <View style={styles.weatherCard}>
          <Text style={styles.sectionTitle}>Weather & Forecast</Text>
          <View style={styles.forecastRow}>
            {WEATHER_FORECAST.map((forecast, index) => (
              <View key={index} style={styles.forecastItem}>
                <Text style={styles.forecastDay}>{forecast.day}</Text>
                <Icon name={forecast.icon} size={26} color="#E28743" style={styles.forecastIcon} />
                <Text style={styles.forecastTemp}>{forecast.temp}</Text>
                <Text style={styles.forecastCond}>{forecast.cond}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI Advisories */}
        <Text style={styles.advisoriesHeading}>Agri AI Advisories</Text>
        {ADVISORIES.map(adv => {
          const isHigh = adv.severity === 'high';
          return (
            <View key={adv.id} style={[styles.advisoryCard, { borderLeftColor: isHigh ? COLORS.error : COLORS.warning }]}>
              <View style={styles.advisoryHeader}>
                <Icon name={isHigh ? 'alert-decagram' : 'information-outline'} size={20} color={isHigh ? COLORS.error : COLORS.warning} />
                <Text style={styles.advisoryTitle}>{adv.title}</Text>
              </View>
              <Text style={styles.advisoryDesc}>{adv.desc}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingVertical: h(20),
    paddingHorizontal: w(20),
    borderBottomLeftRadius: mw(24),
    borderBottomRightRadius: mw(24),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: f(22),
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: f(12),
    color: COLORS.white + 'CC',
    marginTop: h(4),
  },
  scrollContent: {
    paddingHorizontal: w(20),
    paddingBottom: h(40),
    paddingTop: h(16),
  },
  farmSelectorRow: {
    flexDirection: 'row',
    gap: w(10),
    marginBottom: h(16),
  },
  farmTab: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: mw(10),
    paddingVertical: h(10),
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  farmTabText: {
    fontSize: f(11),
    color: COLORS.textLight,
  },
  satelliteCard: {
    backgroundColor: COLORS.white,
    borderRadius: mw(16),
    padding: mw(16),
    marginBottom: h(20),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  satelliteTitle: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.text,
  },
  satelliteTime: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: h(2),
  },
  mapGridContainer: {
    marginTop: h(16),
    alignItems: 'center',
  },
  mapGrid: {
    width: '100%',
    height: h(120),
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: mw(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  mapCell: {
    width: '25%',
    height: h(40),
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: h(10),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: w(10),
    height: w(10),
    borderRadius: w(5),
    marginRight: w(4),
  },
  legendText: {
    fontSize: f(10),
    color: COLORS.textLight,
  },
  ndviSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: mw(10),
    padding: mw(12),
    marginTop: h(16),
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  ndviLabel: {
    fontSize: f(11),
    color: COLORS.textMuted,
  },
  ndviValue: {
    fontSize: f(20),
    fontWeight: '800',
    marginTop: h(2),
  },
  healthIndicatorBadge: {
    paddingHorizontal: w(10),
    paddingVertical: h(6),
    borderRadius: mw(20),
  },
  healthIndicatorText: {
    fontSize: f(11),
    fontWeight: '700',
  },
  scanButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: h(12),
    borderRadius: mw(12),
    marginTop: h(16),
    gap: w(6),
  },
  scanButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(13),
  },
  weatherCard: {
    backgroundColor: COLORS.white,
    borderRadius: mw(16),
    padding: mw(16),
    marginBottom: h(20),
    borderWidth: 1,
    borderColor: '#E9ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: f(15),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: h(14),
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastItem: {
    alignItems: 'center',
    flex: 1,
  },
  forecastDay: {
    fontSize: f(11),
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: h(6),
  },
  forecastIcon: {
    marginBottom: h(6),
  },
  forecastTemp: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  forecastCond: {
    fontSize: f(9),
    color: COLORS.textMuted,
    marginTop: h(2),
    textAlign: 'center',
  },
  advisoriesHeading: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: h(12),
  },
  advisoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: mw(12),
    padding: mw(14),
    marginBottom: h(12),
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: w(6),
  },
  advisoryTitle: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  advisoryDesc: {
    fontSize: f(11),
    color: COLORS.textLight,
    lineHeight: f(16),
    marginTop: h(6),
  },
});
