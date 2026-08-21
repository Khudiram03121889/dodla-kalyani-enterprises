import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COMPANY_DETAILS, DEFAULT_USERS } from '../../config/constants';
import { isSupabaseConfigured } from '../../config/supabase';

export const LoginScreen: React.FC = () => {
  const { login, isLoading: authLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Phone Required', 'Please enter your registered phone number.');
      return;
    }

    setIsSubmitting(true);
    const res = await login(phone, password);
    setIsSubmitting(false);

    if (!res.success) {
      Alert.alert('Login Failed', res.message || 'Please check your phone number and password.');
    }
  };

  const handleQuickFill = (userType: 'owner' | 'executive') => {
    const target = DEFAULT_USERS.find((u) => u.role === userType);
    if (target) {
      setPhone(target.phone);
      setPassword(target.password);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../../assets/kalyani_enterprise_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>Dodla Sales & Billing</Text>
          <Text style={styles.companySubtitle}>{COMPANY_DETAILS.name}</Text>
          <Text style={styles.locationSubtitle}>Ballari, Karnataka</Text>
        </View>

        {/* Login Form */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Account Login</Text>
          <Text style={styles.cardSub}>Sign in using your mobile number and password</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isSubmitting && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting || authLoading}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Quick Demo Fill Buttons */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Quick Demo Sign-In:</Text>
            <View style={styles.demoButtonRow}>
              <TouchableOpacity
                style={[styles.demoChip, styles.ownerChip]}
                onPress={() => handleQuickFill('owner')}
              >
                <Text style={styles.ownerChipText}>👑 Owner Login</Text>
                <Text style={styles.chipPhone}>9900426623</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoChip, styles.execChip]}
                onPress={() => handleQuickFill('executive')}
              >
                <Text style={styles.execChipText}>🚚 Executive Login</Text>
                <Text style={styles.chipPhone}>9538344788</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Database Status Footer */}
        <View style={styles.footerStatus}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isSupabaseConfigured() ? '#10B981' : '#F59E0B' },
            ]}
          />
          <Text style={styles.statusText}>
            {isSupabaseConfigured()
              ? 'Connected to Supabase Cloud Database'
              : 'Offline / Local Database Active (Supabase ready)'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  companySubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 2,
  },
  locationSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  countryCode: {
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  loginBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  demoButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoChip: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  ownerChip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  ownerChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  execChip: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  execChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  chipPhone: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
