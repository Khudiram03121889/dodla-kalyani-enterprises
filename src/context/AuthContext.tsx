import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, UserRole } from '../types';
import { DEFAULT_USERS } from '../config/constants';
import { supabase, isSupabaseConfigured } from '../config/supabase';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchRoleForDemo: (role: UserRole) => void;
}

const AUTH_STORAGE_KEY = '@dodla_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch (e) {
      console.warn('Failed to load auth session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    phone: string,
    password = ''
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanPhone = phone.trim().replace(/\D/g, '');

    // 1. Try Supabase Auth/Profile lookup if Supabase is configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('dodla_profiles')
          .select('*')
          .eq('phone', cleanPhone)
          .single();

        if (data && !error) {
          if (password && data.password_hash && data.password_hash !== password) {
            return { success: false, message: 'Invalid password. Please check your credentials.' };
          }
          const userProfile: UserProfile = {
            id: data.id,
            phone: data.phone,
            full_name: data.full_name,
            role: data.role as UserRole,
            company: (data.company as any) || (data.role === 'owner' ? 'ALL' : 'Dodla'),
            created_at: data.created_at,
          };
          setUser(userProfile);
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
          return { success: true };
        }
      } catch (err) {
        console.warn('Supabase profile query failed, using local auth fallback:', err);
      }
    }

    // 2. Local Fallback & Default Users check
    const matchedUser = DEFAULT_USERS.find((u) => u.phone === cleanPhone);

    if (matchedUser) {
      if (password && matchedUser.password !== password) {
        return { success: false, message: 'Incorrect password for this phone number.' };
      }
      const userProfile: UserProfile = {
        id: matchedUser.id,
        phone: matchedUser.phone,
        full_name: matchedUser.full_name,
        role: matchedUser.role,
        company: matchedUser.company,
      };
      setUser(userProfile);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
      return { success: true };
    }

    return {
      success: false,
      message: 'Mobile number not found. Please verify your number or contact the owner.',
    };
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  const switchRoleForDemo = async (newRole: UserRole) => {
    const target = DEFAULT_USERS.find((u) => u.role === newRole) || DEFAULT_USERS[0];
    const userProfile: UserProfile = {
      id: target.id,
      phone: target.phone,
      full_name: target.full_name,
      role: newRole,
      company: target.company,
    };
    setUser(userProfile);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRoleForDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
