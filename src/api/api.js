import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -------------------------------------------------------------------
// 🔧 API Base URL — switch between modes as needed:
//
//  MODE 1 — Production Backend (Railway)
export const BASE_URL = 'https://rent-a-car-mobile-application-production.up.railway.app';
export const API_URL = BASE_URL; // Alias used by PaymentManagerScreen for image URLs
//
//  MODE 2 — Local Wi-Fi (phone & PC on same network, firewall open)
//           export const BASE_URL = 'http://192.168.8.194:5000';
//
//  MODE 3 — Android Emulator only
//           export const BASE_URL = 'http://10.0.2.2:5000';
// -------------------------------------------------------------------

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // increased to 15s for tunnel latency
  headers: {
    'Content-Type': 'application/json',
    // Bypass localtunnel's interstitial/reminder page
    'bypass-tunnel-reminder': 'true',
  },
});

// Attach JWT token automatically to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // AsyncStorage unavailable — continue without token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
