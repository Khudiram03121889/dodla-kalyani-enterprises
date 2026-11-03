import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COMPANY_DETAILS, DEFAULT_USERS } from '../../config/constants';
import { DesktopSalesDashboard } from './DesktopSalesDashboard';
import { DesktopInventoryScreen } from './DesktopInventoryScreen';
import { DesktopRouteSummaryScreen } from './DesktopRouteSummaryScreen';
import { DesktopPunchOrderScreen } from './DesktopPunchOrderScreen';

export type DesktopTab = 'sales' | 'inventory' | 'routesummary' | 'punchorder';

export const DesktopLayout: React.FC = () => {
  const { user, role, logout, switchRoleForDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<DesktopTab>(
    role === 'owner' ? 'sales' : 'punchorder'
  );

  // Automatically keep tab synchronized when role changes
  React.useEffect(() => {
    if (role === 'owner') {
      if (activeTab === 'punchorder') {
        setActiveTab('sales');
      }
    } else {
      setActiveTab('punchorder');
    }
  }, [role]);

  const handleRoleToggle = () => {
    if (role === 'owner') {
      switchRoleForDemo('executive');
    } else {
      switchRoleForDemo('owner');
    }
  };

  return (
    <View style={styles.shell}>
      {/* Top Desktop Navigation Header */}
      <View style={styles.topHeader}>
        {/* Brand Left */}
        <View style={styles.brandRow}>
          <Image
            source={require('../../../assets/kalyani_enterprise_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.brandInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>{COMPANY_DETAILS.name}</Text>
              <View style={styles.distributorBadge}>
                <Text style={styles.distributorBadgeText}>
                  {role === 'owner' ? 'Dodla Dairy Distributor' : 'Field Executive Workstation'}
                </Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>
              {COMPANY_DETAILS.addressLine1} {COMPANY_DETAILS.addressLine2} • GSTIN: {COMPANY_DETAILS.gstin}
            </Text>
          </View>
        </View>

        {/* User & Status Right */}
        <View style={styles.headerRight}>
          {/* Role & User Badge */}
          <View style={styles.userBadge}>
            <Text style={styles.roleIcon}>
              {role === 'owner' ? '👑' : '🚚'}
            </Text>
            <View>
              <Text style={styles.userName}>{user?.full_name || (role === 'owner' ? 'Owner' : 'Executive')}</Text>
              <Text style={styles.userRole}>
                {role === 'owner' ? 'Administrator' : 'Field Executive'} • {user?.phone}
              </Text>
            </View>
          </View>

          {/* Switch Role Quick Button */}
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={handleRoleToggle}
            activeOpacity={0.8}
          >
            <Text style={styles.switchBtnText}>
              {role === 'owner' ? 'Switch to Exec' : 'Switch to Owner'}
            </Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Tabs Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLinks}>
          {role === 'owner' ? (
            <>
              <TouchableOpacity
                style={[styles.navTab, activeTab === 'sales' && styles.navTabActive]}
                onPress={() => setActiveTab('sales')}
              >
                <Text style={styles.navTabIcon}>📊</Text>
                <Text style={[styles.navTabText, activeTab === 'sales' && styles.navTabTextActive]}>
                  Sales & Invoices
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navTab, activeTab === 'inventory' && styles.navTabActive]}
                onPress={() => setActiveTab('inventory')}
              >
                <Text style={styles.navTabIcon}>📦</Text>
                <Text
                  style={[
                    styles.navTabText,
                    activeTab === 'inventory' && styles.navTabTextActive,
                  ]}
                >
                  Godown Stock
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navTab, activeTab === 'routesummary' && styles.navTabActive]}
                onPress={() => setActiveTab('routesummary')}
              >
                <Text style={styles.navTabIcon}>📋</Text>
                <Text
                  style={[
                    styles.navTabText,
                    activeTab === 'routesummary' && styles.navTabTextActive,
                  ]}
                >
                  Route Summary Sheet
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'punchorder' && styles.navTabActive]}
              onPress={() => setActiveTab('punchorder')}
            >
              <Text style={styles.navTabIcon}>🚚</Text>
              <Text
                style={[
                  styles.navTabText,
                  activeTab === 'punchorder' && styles.navTabTextActive,
                ]}
              >
                Punch Order Station (Executive)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.mainContainer}>
        {role === 'owner' ? (
          <>
            {activeTab === 'sales' && <DesktopSalesDashboard />}
            {activeTab === 'inventory' && <DesktopInventoryScreen />}
            {activeTab === 'routesummary' && <DesktopRouteSummaryScreen />}
          </>
        ) : (
          <DesktopPunchOrderScreen />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    minHeight: '100vh' as any,
  },
  topHeader: {
    backgroundColor: '#1E3A8A', // Official Dodla Blue
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E40AF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 46,
    height: 46,
    marginRight: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  brandInfo: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  distributorBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distributorBadgeText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '700',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 8,
  },
  roleIcon: {
    fontSize: 18,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  userRole: {
    color: '#BFDBFE',
    fontSize: 11,
  },
  switchBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  switchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  navBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  navTabActive: {
    borderBottomColor: '#1E3A8A',
  },
  navTabIcon: {
    fontSize: 16,
  },
  navTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  navTabTextActive: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  mainContainer: {
    padding: 24,
    maxWidth: 1600,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
});
