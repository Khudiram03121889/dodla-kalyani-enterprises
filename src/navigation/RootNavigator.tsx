import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ExecutiveNavigator } from './ExecutiveNavigator';
import { OwnerNavigator } from './OwnerNavigator';

const Stack = createStackNavigator();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : role === 'owner' ? (
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
