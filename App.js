import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';

// Auth Screens
import LoginScreen    from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Vehicle Screens
import HomeScreen         from './src/screens/vehicle/HomeScreen';
import AddVehicleScreen   from './src/screens/vehicle/AddVehicleScreen';
import VehicleDetailScreen from './src/screens/vehicle/VehicleDetailScreen';

// Owner Screens
import OwnerVehiclesScreen from './src/screens/owner/OwnerVehiclesScreen';
import OwnerDashboardScreen from './src/screens/owner/OwnerDashboardScreen';

// Admin Screens
import AdminDashboard           from './src/screens/admin/AdminDashboard';
import AnalyticsScreen          from './src/screens/admin/AnalyticsScreen';
import UserManagementScreen     from './src/screens/admin/UserManagementScreen';
import FleetManagementScreen    from './src/screens/admin/FleetManagementScreen';
import AllBookingsScreen        from './src/screens/admin/AllBookingsScreen';
import FeedbackModerationScreen from './src/screens/admin/FeedbackModerationScreen';

// Booking Screens
import BookingScreen from './src/screens/booking/BookingScreen';
import PaymentScreen from './src/screens/booking/PaymentScreen';

// Customer Screens
import MyBookingsScreen from './src/screens/customer/MyBookingsScreen';
import KYCUploadScreen from './src/screens/customer/KYCUploadScreen';

// Profile Screen (shared by all roles)
import ProfileScreen from './src/screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const PRIMARY = '#1E3A8A';

const TabIcon = ({ emoji, focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

// ── Customer Tabs ──────────────────────────────────────────────────
function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: PRIMARY, tabBarStyle: { paddingBottom: 6, height: 60 } }}>
      <Tab.Screen name="Home"       component={HomeScreen}       options={{ tabBarIcon: (p) => <TabIcon emoji="🚗" {...p} />, title: 'Browse Cars'  }} />
      <Tab.Screen name="MyBookings" component={MyBookingsScreen} options={{ tabBarIcon: (p) => <TabIcon emoji="📋" {...p} />, title: 'My Bookings'  }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}    options={{ tabBarIcon: (p) => <TabIcon emoji="👤" {...p} />, title: 'My Profile'   }} />
    </Tab.Navigator>
  );
}

// ── Car Owner Tabs ─────────────────────────────────────────────────
function CarOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: PRIMARY, tabBarStyle: { paddingBottom: 6, height: 60 } }}>
      <Tab.Screen name="Dashboard"  component={OwnerDashboardScreen} options={{ tabBarIcon: (p) => <TabIcon emoji="📈" {...p} />, title: 'Dashboard' }} />
      <Tab.Screen name="MyFleet"    component={OwnerVehiclesScreen}  options={{ tabBarIcon: (p) => <TabIcon emoji="🚗" {...p} />, title: 'My Fleet' }} />
      <Tab.Screen name="AddVehicle" component={AddVehicleScreen}     options={{ tabBarIcon: (p) => <TabIcon emoji="➕" {...p} />, title: 'Add Vehicle' }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}        options={{ tabBarIcon: (p) => <TabIcon emoji="👤" {...p} />, title: 'Profile'  }} />
    </Tab.Navigator>
  );
}

// ── Admin Tabs ─────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: PRIMARY, tabBarStyle: { paddingBottom: 6, height: 60 } }}>
      <Tab.Screen name="Analytics"      component={AnalyticsScreen} options={{ tabBarIcon: (p) => <TabIcon emoji="📊" {...p} />, title: 'Dashboard'  }} />
      <Tab.Screen name="AdminDashboard" component={AdminDashboard}  options={{ tabBarIcon: (p) => <TabIcon emoji="🛡️" {...p} />, title: 'Approvals'  }} />
      <Tab.Screen name="Profile"        component={ProfileScreen}   options={{ tabBarIcon: (p) => <TabIcon emoji="👤" {...p} />, title: 'My Profile' }} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const MainTabs = user?.role === 'Admin'
    ? AdminTabs
    : user?.role === 'Car Owner'
    ? CarOwnerTabs
    : CustomerTabs;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main"    component={MainTabs} />
          <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ headerShown: true, title: 'Vehicle Details', headerTintColor: PRIMARY }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ headerShown: true, title: 'Book Vehicle', headerTintColor: PRIMARY }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true, title: 'Payment',      headerTintColor: PRIMARY }} />
          <Stack.Screen name="KYCUpload" component={KYCUploadScreen} options={{ headerShown: true, title: 'Identity Verification', headerTintColor: PRIMARY }} />
          
          {/* Admin Management Screens */}
          <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ headerShown: true, title: 'Manage Users', headerTintColor: PRIMARY }} />
          <Stack.Screen name="FleetManagement" component={FleetManagementScreen} options={{ headerShown: true, title: 'Manage Fleet', headerTintColor: PRIMARY }} />
          <Stack.Screen name="AllBookings" component={AllBookingsScreen} options={{ headerShown: true, title: 'Platform Bookings', headerTintColor: PRIMARY }} />
          <Stack.Screen name="FeedbackModeration" component={FeedbackModerationScreen} options={{ headerShown: true, title: 'Review Feedback', headerTintColor: PRIMARY }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}