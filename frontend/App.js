import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Auth Screens
import IntroScreen    from './src/screens/auth/IntroScreen';
import LoginScreen    from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Vehicle Screens
import HomeScreen         from './src/screens/vehicle/HomeScreen';
import AddVehicleScreen   from './src/screens/vehicle/AddVehicleScreen';
import VehicleDetailScreen from './src/screens/vehicle/VehicleDetailScreen';

// Owner Screens
import OwnerVehiclesScreen from './src/screens/owner/OwnerVehiclesScreen';
import OwnerDashboardScreen from './src/screens/owner/OwnerDashboardScreen';
import OwnerFeedbackScreen from './src/screens/owner/OwnerFeedbackScreen';
import OwnerAnalyticsScreen from './src/screens/owner/OwnerAnalyticsScreen';

// Admin Screens
import AdminDashboard           from './src/screens/admin/AdminDashboard';
import AnalyticsScreen          from './src/screens/admin/AnalyticsScreen';
import UserManagementScreen     from './src/screens/admin/UserManagementScreen';
import FleetManagementScreen    from './src/screens/admin/FleetManagementScreen';
import AllBookingsScreen        from './src/screens/admin/AllBookingsScreen';
import FeedbackModerationScreen from './src/screens/admin/FeedbackModerationScreen';
import AdminReportScreen        from './src/screens/admin/AdminReportScreen';
import PaymentManagerScreen     from './src/screens/admin/PaymentManagerScreen';
import ReportManagerScreen      from './src/screens/admin/ReportManagerScreen';

// Booking Screens
import BookingScreen from './src/screens/booking/BookingScreen';
import PaymentScreen from './src/screens/booking/PaymentScreen';

// Customer Screens
import MyBookingsScreen from './src/screens/customer/MyBookingsScreen';
import KYCUploadScreen from './src/screens/customer/KYCUploadScreen';
import CustomerFeedbackScreen from './src/screens/customer/CustomerFeedbackScreen';

// Profile Screen (shared by all roles)
import ProfileScreen from './src/screens/profile/ProfileScreen';

// Shared
import NotificationsScreen from './src/screens/shared/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TabIconVector = ({ name, focused, color }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <MaterialCommunityIcons name={name} size={26} color={color} />
    {focused && (
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, marginTop: 4 }} />
    )}
  </View>
);

const baseTabOptions = (colors) => ({
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarShowLabel: false,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
});

// ── Customer Tabs ──────────────────────────────────────────────────
function CustomerTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={baseTabOptions(colors)}>
      <Tab.Screen name="Home"       component={HomeScreen}       options={{ tabBarIcon: (p) => <TabIconVector name="home" {...p} /> }} />
      <Tab.Screen name="MyBookings" component={MyBookingsScreen} options={{ tabBarIcon: (p) => <TabIconVector name="calendar-month" {...p} /> }} />
      <Tab.Screen name="MyReviews"  component={CustomerFeedbackScreen} options={{ tabBarIcon: (p) => <TabIconVector name="star" {...p} /> }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}    options={{ tabBarIcon: (p) => <TabIconVector name="account-outline" {...p} /> }} />
    </Tab.Navigator>
  );
}

// ── Car Owner Tabs ─────────────────────────────────────────────────
function CarOwnerTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={baseTabOptions(colors)}>
      <Tab.Screen name="Dashboard"  component={OwnerDashboardScreen} options={{ tabBarIcon: (p) => <TabIconVector name="view-dashboard-outline" {...p} /> }} />
      <Tab.Screen name="MyFleet"    component={OwnerVehiclesScreen}  options={{ tabBarIcon: (p) => <TabIconVector name="car-multiple" {...p} /> }} />
      <Tab.Screen name="Reviews"    component={OwnerFeedbackScreen}  options={{ tabBarIcon: (p) => <TabIconVector name="star-outline" {...p} /> }} />
      <Tab.Screen name="Reports"    component={OwnerAnalyticsScreen} options={{ tabBarIcon: (p) => <TabIconVector name="chart-bar" {...p} /> }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}        options={{ tabBarIcon: (p) => <TabIconVector name="account-outline" {...p} /> }} />
    </Tab.Navigator>
  );
}

// ── Admin Tabs ─────────────────────────────────────────────────────
function AdminTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={baseTabOptions(colors)}>
      <Tab.Screen name="Analytics"      component={AnalyticsScreen} options={{ tabBarIcon: (p) => <TabIconVector name="chart-line" {...p} /> }} />
      <Tab.Screen name="AdminDashboard" component={AdminDashboard}  options={{ tabBarIcon: (p) => <TabIconVector name="shield-check-outline" {...p} /> }} />
      <Tab.Screen name="UserManagement" component={UserManagementScreen} options={{ tabBarIcon: (p) => <TabIconVector name="account-group-outline" {...p} /> }} />
      <Tab.Screen name="Profile"        component={ProfileScreen}   options={{ tabBarIcon: (p) => <TabIconVector name="account-outline" {...p} /> }} />
    </Tab.Navigator>
  );
}

// ── Staff Tabs (dynamic based on staffRole) ───────────────────
function StaffTabs() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const role = user?.staffRole;

  return (
    <Tab.Navigator screenOptions={baseTabOptions(colors)}>
      {role === 'Booking Manager' && (
        <Tab.Screen name="Bookings" component={AllBookingsScreen}
          options={{ tabBarIcon: (p) => <TabIconVector name="clipboard-text-outline" {...p} /> }} />
      )}
      {role === 'Feedback Manager' && (
        <Tab.Screen name="Feedback" component={FeedbackModerationScreen}
          options={{ tabBarIcon: (p) => <TabIconVector name="star-outline" {...p} /> }} />
      )}
      {role === 'Vehicle Manager' && (
        <Tab.Screen name="Fleet" component={FleetManagementScreen}
          options={{ tabBarIcon: (p) => <TabIconVector name="car-multiple" {...p} /> }} />
      )}
      {role === 'Vehicle Validation Manager' && (
        <Tab.Screen name="Approvals" component={AdminDashboard}
          options={{ tabBarIcon: (p) => <TabIconVector name="shield-check-outline" {...p} /> }} />
      )}
      {role === 'Payment Manager' && (
        <Tab.Screen name="Payments" component={PaymentManagerScreen}
          options={{ tabBarIcon: (p) => <TabIconVector name="cash-multiple" {...p} /> }} />
      )}
      {role === 'Report Handling Manager' && (
        <Tab.Screen name="Analytics" component={ReportManagerScreen}
          options={{ tabBarIcon: (p) => <TabIconVector name="chart-bar" {...p} /> }} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: (p) => <TabIconVector name="account-outline" {...p} /> }} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const MainTabs = user?.role === 'Admin'
    ? AdminTabs
    : user?.role === 'Staff'
    ? StaffTabs
    : user?.role === 'Car Owner'
    ? CarOwnerTabs
    : CustomerTabs;

  const stackHeaderOptions = {
    headerShown: true,
    headerTintColor: colors.textPrimary,
    headerStyle: { backgroundColor: colors.surface },
    headerTitleStyle: { fontWeight: '700', fontSize: 18 },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      {!user ? (
        <>
          <Stack.Screen name="Intro"    component={IntroScreen} />
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main"    component={MainTabs} />
          <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ ...stackHeaderOptions, title: 'Vehicle Summary' }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ ...stackHeaderOptions, title: 'Book Vehicle' }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ ...stackHeaderOptions, title: 'Secure Checkout' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...stackHeaderOptions, title: 'Notifications' }} />
          <Stack.Screen name="KYCUpload" component={KYCUploadScreen} options={{ ...stackHeaderOptions, title: 'Identity Check' }} />
          <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ ...stackHeaderOptions, title: 'Add to Fleet' }} />
          
          {/* Admin Management Screens (Restricted Route) */}
          {(user?.role === 'Admin' || user?.role === 'Staff') && (
            <>
              <Stack.Screen name="FleetManagement" component={FleetManagementScreen} options={{ ...stackHeaderOptions, title: 'Manage Fleet' }} />
              <Stack.Screen name="AllBookings" component={AllBookingsScreen} options={{ ...stackHeaderOptions, title: 'Platform Bookings' }} />
              <Stack.Screen name="FeedbackModeration" component={FeedbackModerationScreen} options={{ ...stackHeaderOptions, title: 'Review Feedback' }} />
              <Stack.Screen name="AdminReport" component={AdminReportScreen} options={{ ...stackHeaderOptions, title: 'Platform Report' }} />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}