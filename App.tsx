import React from 'react';
import { Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { StoreProvider } from './src/context/StoreContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Polyfill Alert.alert for React Native Web where it is otherwise a no-op
if (Platform.OS === 'web') {
  Alert.alert = (title: string, message?: string, buttons?: any[]) => {
    const fullText = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length === 0) {
      if (typeof window !== 'undefined') {
        window.alert(fullText);
      }
    } else if (buttons.length === 1) {
      if (typeof window !== 'undefined') {
        window.alert(fullText);
      }
      buttons[0]?.onPress?.();
    } else {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(fullText);
        if (confirmed) {
          const actionBtn =
            buttons.find(
              (b) => b.style !== 'cancel' && b.text?.toLowerCase() !== 'cancel'
            ) || buttons[buttons.length - 1];
          actionBtn?.onPress?.();
        } else {
          const cancelBtn = buttons.find(
            (b) => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel'
          );
          cancelBtn?.onPress?.();
        }
      }
    }
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StoreProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </StoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
