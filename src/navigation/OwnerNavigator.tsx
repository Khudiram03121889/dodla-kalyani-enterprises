import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { SalesDashboardScreen } from '../screens/owner/SalesDashboardScreen';
import { InventoryScreen } from '../screens/owner/InventoryScreen';
import { RouteSummaryScreen } from '../screens/owner/RouteSummaryScreen';
import { InvoicePreviewScreen } from '../screens/owner/InvoicePreviewScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const OwnerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E3A8A',
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
        name="SalesDashboard"
        component={SalesDashboardScreen}
        options={{
          tabBarLabel: 'Sales & Bills',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarLabel: 'Godown Stock',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="RouteSummaryTab"
        component={RouteSummaryScreen}
        options={{
          tabBarLabel: 'Route Summary',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const OwnerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="OwnerMain" component={OwnerTabs} />
      <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} />
      <Stack.Screen name="RouteSummary" component={RouteSummaryScreen} />
    </Stack.Navigator>
  );
};
