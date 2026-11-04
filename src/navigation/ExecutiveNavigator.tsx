import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { RouteSelectScreen } from '../screens/executive/RouteSelectScreen';
import { PunchOrderScreen } from '../screens/executive/PunchOrderScreen';
import { InventoryScreen } from '../screens/owner/InventoryScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ExecutiveOrderStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RouteSelect" component={RouteSelectScreen} />
      <Stack.Screen name="PunchOrder" component={PunchOrderScreen} />
    </Stack.Navigator>
  );
};

export const ExecutiveNavigator: React.FC = () => {
  const { user } = useAuth();
  const isGopal = user?.company === 'Gopal Chips';
  const activeColor = isGopal ? '#EA580C' : '#1E3A8A';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Orders"
        component={ExecutiveOrderStack}
        options={{
          tabBarLabel: 'Punch Orders',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🚚</Text>,
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarLabel: 'My Inventory',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
