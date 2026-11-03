import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ExecutiveNavigator } from './ExecutiveNavigator';
import { OwnerNavigator } from './OwnerNavigator';
import { DesktopLayout } from '../components/desktop/DesktopLayout';

const Stack = createStackNavigator();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // On desktop computer layout: Render comprehensive Desktop Workstation
  if (isDesktop) {
    return <DesktopLayout />;
  }

  // On mobile devices / narrow screens: Keep native mobile stack & tabs
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {role === 'owner' ? (
          <Stack.Screen name="OwnerRoot" component={OwnerNavigator} />
        ) : (
          <Stack.Screen name="ExecutiveRoot" component={ExecutiveNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});

