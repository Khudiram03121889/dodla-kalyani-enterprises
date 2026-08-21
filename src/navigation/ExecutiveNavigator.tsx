import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RouteSelectScreen } from '../screens/executive/RouteSelectScreen';
import { PunchOrderScreen } from '../screens/executive/PunchOrderScreen';

const Stack = createStackNavigator();

export const ExecutiveNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="RouteSelect" component={RouteSelectScreen} />
      <Stack.Screen name="PunchOrder" component={PunchOrderScreen} />
    </Stack.Navigator>
  );
};
