import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -------------------------------------------------------------------
// 🔧 API Base URL — switch between modes as needed:
//
//  MODE 1 — Production Backend (Railway)
export const BASE_URL = 'https://rent-a-car-mobile-application-production.up.railway.app';
export const API_URL = BASE_URL; // Alias used by PaymentManagerScreen for image URLs

//  MODE 2 — Local Wi-Fi (phone & PC on same network, firewall open)
// export const BASE_URL = 'http://192.168.8.194:5000';

//  MODE 3 — Android Emulator only
// export const BASE_URL = 'http://10.0.2.2:5000';
// export const API_URL = BASE_URL; // Alias used by PaymentManagerScreen for image URLs
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

// ── Feedback API Functions ──────────────────────────────────────────
export const submitFeedback = async (bookingId, rating, comment) => {
  const response = await api.post('/api/feedback', { bookingId, rating, comment });
  return response.data;
};

export const uploadFeedbackPhoto = async (feedbackId, photoUri) => {
  const formData = new FormData();
  const ext = photoUri.split('.').pop().toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  formData.append('photo', { uri: photoUri, name: `review_${Date.now()}.${ext}`, type: mime });
  const response = await api.post(`/api/feedback/${feedbackId}/upload-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getMyFeedback = async () => {
  const response = await api.get('/api/feedback/my');
  return response.data;
};

// ── Booking API Functions ───────────────────────────────────────────
export const createBooking = async (bookingData) => {
  const response = await api.post('/api/bookings', bookingData);
  return response.data;
};

export const uploadPaymentSlip = async (bookingId, paymentSlipUri) => {
  const formData = new FormData();
  const uriParts = paymentSlipUri.split('.');
  const fileType = uriParts[uriParts.length - 1].toLowerCase();
  const mimeType = fileType === 'jpg' || fileType === 'jpeg' ? 'image/jpeg' : `image/${fileType}`;
  formData.append('paymentSlip', { uri: paymentSlipUri, name: `slip_${Date.now()}.${fileType}`, type: mimeType });
  const response = await api.post(`/api/bookings/${bookingId}/upload-slip`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getMyBookings = async () => {
  const response = await api.get('/api/bookings/my');
  return response.data;
};

export const updateBookingStatus = async (bookingId, status) => {
  const response = await api.patch(`/api/bookings/${bookingId}/status`, { status });
  return response.data;
};

export const rescheduleBooking = async (bookingId, newStartDate, newEndDate) => {
  const response = await api.patch(`/api/bookings/${bookingId}/reschedule`, { newStartDate, newEndDate });
  return response.data;
};
