import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Route, Shop, Category, Product, Order, OrderItem, CompanyDivision } from '../types';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { calculateOrderTax } from '../utils/taxCalculator';
import { generateOrderNumbers } from '../utils/formatters';
import { useAuth } from './AuthContext';

interface StoreContextType {
  // Scoped to active user (Executive sees only their company, Owner sees all)
  routes: Route[];
  shops: Shop[];
  categories: Category[];
  products: Product[];
  orders: Order[];

  // Explicit Company Collections (Useful for Owner tabs & deep separation)
  dodlaRoutes: Route[];
  gopalRoutes: Route[];
  dodlaShops: Shop[];
  gopalShops: Shop[];
  dodlaCategories: Category[];
  gopalCategories: Category[];
  dodlaProducts: Product[];
  gopalProducts: Product[];
  dodlaOrders: Order[];
  gopalOrders: Order[];

  isLoading: boolean;
  addRoute: (name: string, company?: CompanyDivision) => Promise<Route>;
  deleteRoute: (id: string) => Promise<void>;
  addShop: (shop: Omit<Shop, 'id' | 'created_at'>) => Promise<Shop>;
  deleteShop: (id: string) => Promise<void>;
  addCategory: (name: string, hsnCode?: string, company?: CompanyDivision) => Promise<Category>;
  updateCategory: (id: string, name: string, hsnCode?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (productId: string, newStockQty: number) => Promise<void>;
  punchOrder: (params: {
    routeId: string;
    routeName: string;
    shop: Shop;
    executiveId: string;
    executiveName: string;
    executivePhone: string;
    company?: CompanyDivision;
    items: { product: Product; qty: number }[];
  }) => Promise<Order>;
  updateOrder: (
    orderId: string,
    items: { product: Product; qty: number }[]
  ) => Promise<Order>;
  markOrderAsPrinted: (orderId: string) => Promise<void>;
  clearAllOrders: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const STORAGE_KEYS = {
  DODLA_ROUTES: '@dodla_routes',
  GOPAL_ROUTES: '@gopal_routes',
  DODLA_SHOPS: '@dodla_shops',
  GOPAL_SHOPS: '@gopal_shops',
  DODLA_CATEGORIES: '@dodla_categories',
  GOPAL_CATEGORIES: '@gopal_categories',
  DODLA_PRODUCTS: '@dodla_products',
  GOPAL_PRODUCTS: '@gopal_products',
  DODLA_ORDERS: '@dodla_orders',
  GOPAL_ORDERS: '@gopal_orders',
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Fallback Seeds for Offline Cold Starts
const SEED_DODLA_ROUTES: Route[] = [
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'COWL BAZAR', company: 'Dodla' },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'CANTONMENT', company: 'Dodla' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'GANDHI NAGAR', company: 'Dodla' },
];

const SEED_GOPAL_ROUTES: Route[] = [
  { id: 'g0000000-0000-0000-0000-000000000001', name: 'MAIN MARKET', company: 'Gopal Chips' },
  { id: 'g0000000-0000-0000-0000-000000000002', name: 'STATION ROAD', company: 'Gopal Chips' },
];

const SEED_DODLA_CATEGORIES: Category[] = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Badam Milk', hsn_code: '22029990', display_order: 1, company: 'Dodla' },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Soan Papdi', hsn_code: '21069099', display_order: 2, company: 'Dodla' },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Gulab Jamun', hsn_code: '21069099', display_order: 3, company: 'Dodla' },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'Doodh Pedha', hsn_code: '21069099', display_order: 4, company: 'Dodla' },
];

const SEED_GOPAL_CATEGORIES: Category[] = [
  { id: 'g0000000-0000-0000-0000-000000000001', name: 'Chips', hsn_code: '20052000', display_order: 1, company: 'Gopal Chips' },
  { id: 'g0000000-0000-0000-0000-000000000002', name: 'Cristos', hsn_code: '21069099', display_order: 2, company: 'Gopal Chips' },
];

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Dodla Collections
  const [dodlaRoutes, setDodlaRoutes] = useState<Route[]>([]);
  const [dodlaShops, setDodlaShops] = useState<Shop[]>([]);
  const [dodlaCategories, setDodlaCategories] = useState<Category[]>([]);
  const [dodlaProducts, setDodlaProducts] = useState<Product[]>([]);
  const [dodlaOrders, setDodlaOrders] = useState<Order[]>([]);

  // Gopal Collections
  const [gopalRoutes, setGopalRoutes] = useState<Route[]>([]);
  const [gopalShops, setGopalShops] = useState<Shop[]>([]);
  const [gopalCategories, setGopalCategories] = useState<Category[]>([]);
  const [gopalProducts, setGopalProducts] = useState<Product[]>([]);
  const [gopalOrders, setGopalOrders] = useState<Order[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Reload data when auth state changes or on initial mount
  useEffect(() => {
    loadAllData();
  }, [user?.id, user?.company]);

  const loadAllData = async () => {
    setIsLoading(true);
    let remoteSuccess = false;

    // 1. Fetch Dodla & Gopal tables in parallel from Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const [
          dRoutesRes,
          dShopsRes,
          dCatsRes,
          dProdsRes,
          dOrdersRes,
          gRoutesRes,
          gShopsRes,
          gCatsRes,
          gProdsRes,
          gOrdersRes,
        ] = await Promise.all([
          supabase.from('dodla_routes').select('*').order('name'),
          supabase.from('dodla_shops').select('*').order('name'),
          supabase.from('dodla_categories').select('*').order('display_order'),
          supabase.from('dodla_products').select('*').order('name'),
          supabase.from('dodla_orders').select('*, items:dodla_order_items(*)').order('created_at', { ascending: false }),
          supabase.from('gopal_routes').select('*').order('name'),
          supabase.from('gopal_shops').select('*').order('name'),
          supabase.from('gopal_categories').select('*').order('display_order'),
          supabase.from('gopal_products').select('*').order('name'),
          supabase.from('gopal_orders').select('*, items:gopal_order_items(*)').order('created_at', { ascending: false }),
        ]);

        // Process Dodla
        if (dRoutesRes.data && !dRoutesRes.error) {
          const normDRoutes: Route[] = dRoutesRes.data.map((r: any) => ({ ...r, company: 'Dodla' as CompanyDivision }));
          setDodlaRoutes(normDRoutes);
          await AsyncStorage.setItem(STORAGE_KEYS.DODLA_ROUTES, JSON.stringify(normDRoutes));
        }
        if (dShopsRes.data && !dShopsRes.error) {
          const normDShops: Shop[] = dShopsRes.data.map((s: any) => ({ ...s, company: 'Dodla' as CompanyDivision }));
          setDodlaShops(normDShops);
          await AsyncStorage.setItem(STORAGE_KEYS.DODLA_SHOPS, JSON.stringify(normDShops));
        }
        if (dCatsRes.data && !dCatsRes.error) {
          const normDCats: Category[] = dCatsRes.data.map((c: any) => ({ ...c, company: 'Dodla' as CompanyDivision }));
          setDodlaCategories(normDCats);
          await AsyncStorage.setItem(STORAGE_KEYS.DODLA_CATEGORIES, JSON.stringify(normDCats));
        }
        if (dProdsRes.data && !dProdsRes.error) {
          const normDProds: Product[] = dProdsRes.data.map((p: any) => ({ ...p, company: 'Dodla' as CompanyDivision }));
          setDodlaProducts(normDProds);
          await AsyncStorage.setItem(STORAGE_KEYS.DODLA_PRODUCTS, JSON.stringify(normDProds));
        }
        if (dOrdersRes.data && !dOrdersRes.error) {
          const normDOrders: Order[] = dOrdersRes.data.map((o: any) => ({
            ...o,
            company: 'Dodla' as CompanyDivision,
            items: (o.items || []).map((it: any) => ({ ...it, company: 'Dodla' as CompanyDivision })),
          }));
          setDodlaOrders(normDOrders);
          await AsyncStorage.setItem(STORAGE_KEYS.DODLA_ORDERS, JSON.stringify(normDOrders));
        }

        // Process Gopal
        if (gRoutesRes.data && !gRoutesRes.error) {
          const normGRoutes: Route[] = gRoutesRes.data.map((r: any) => ({ ...r, company: 'Gopal Chips' as CompanyDivision }));
          setGopalRoutes(normGRoutes);
          await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_ROUTES, JSON.stringify(normGRoutes));
        }
        if (gShopsRes.data && !gShopsRes.error) {
          const normGShops: Shop[] = gShopsRes.data.map((s: any) => ({ ...s, company: 'Gopal Chips' as CompanyDivision }));
          setGopalShops(normGShops);
          await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_SHOPS, JSON.stringify(normGShops));
        }
        if (gCatsRes.data && !gCatsRes.error) {
          const normGCats: Category[] = gCatsRes.data.map((c: any) => ({ ...c, company: 'Gopal Chips' as CompanyDivision }));
          setGopalCategories(normGCats);
          await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_CATEGORIES, JSON.stringify(normGCats));
        }
        if (gProdsRes.data && !gProdsRes.error) {
          const normGProds: Product[] = gProdsRes.data.map((p: any) => ({ ...p, company: 'Gopal Chips' as CompanyDivision }));
          setGopalProducts(normGProds);
          await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_PRODUCTS, JSON.stringify(normGProds));
        }
        if (gOrdersRes.data && !gOrdersRes.error) {
          const normGOrders: Order[] = gOrdersRes.data.map((o: any) => ({
            ...o,
            company: 'Gopal Chips' as CompanyDivision,
            items: (o.items || []).map((it: any) => ({ ...it, company: 'Gopal Chips' as CompanyDivision })),
          }));
          setGopalOrders(normGOrders);
          await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_ORDERS, JSON.stringify(normGOrders));
        }

        remoteSuccess = true;
      } catch (e) {
        console.warn('Supabase remote fetch failed, falling back to local storage:', e);
      }
    }

    // 2. Fallback to Local Storage if offline or error
    if (!remoteSuccess) {
      try {
        const [
          savedDRoutes, savedGRoutes,
          savedDShops, savedGShops,
          savedDCats, savedGCats,
          savedDProds, savedGProds,
          savedDOrders, savedGOrders,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.DODLA_ROUTES),
          AsyncStorage.getItem(STORAGE_KEYS.GOPAL_ROUTES),
          AsyncStorage.getItem(STORAGE_KEYS.DODLA_SHOPS),
          AsyncStorage.getItem(STORAGE_KEYS.GOPAL_SHOPS),
          AsyncStorage.getItem(STORAGE_KEYS.DODLA_CATEGORIES),
          AsyncStorage.getItem(STORAGE_KEYS.GOPAL_CATEGORIES),
          AsyncStorage.getItem(STORAGE_KEYS.DODLA_PRODUCTS),
          AsyncStorage.getItem(STORAGE_KEYS.GOPAL_PRODUCTS),
          AsyncStorage.getItem(STORAGE_KEYS.DODLA_ORDERS),
          AsyncStorage.getItem(STORAGE_KEYS.GOPAL_ORDERS),
        ]);

        setDodlaRoutes(savedDRoutes ? JSON.parse(savedDRoutes) : SEED_DODLA_ROUTES);
        setGopalRoutes(savedGRoutes ? JSON.parse(savedGRoutes) : SEED_GOPAL_ROUTES);

        setDodlaShops(savedDShops ? JSON.parse(savedDShops) : []);
        setGopalShops(savedGShops ? JSON.parse(savedGShops) : []);

        setDodlaCategories(savedDCats ? JSON.parse(savedDCats) : SEED_DODLA_CATEGORIES);
        setGopalCategories(savedGCats ? JSON.parse(savedGCats) : SEED_GOPAL_CATEGORIES);

        setDodlaProducts(savedDProds ? JSON.parse(savedDProds) : []);
        setGopalProducts(savedGProds ? JSON.parse(savedGProds) : []);

        setDodlaOrders(savedDOrders ? JSON.parse(savedDOrders) : []);
        setGopalOrders(savedGOrders ? JSON.parse(savedGOrders) : []);
      } catch (err) {
        console.warn('Error reading local offline storage:', err);
      }
    }

    setIsLoading(false);
  };

  // Helper to resolve effective target company for an action
  const resolveCompany = (explicitCompany?: CompanyDivision): CompanyDivision => {
    if (explicitCompany) return explicitCompany;
    if (user?.company && user.company !== 'ALL') {
      return user.company as CompanyDivision;
    }
    return 'Dodla';
  };

  // ----------------------------------------------------
  // ROUTE ACTIONS
  // ----------------------------------------------------
  const addRoute = async (name: string, company?: CompanyDivision): Promise<Route> => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Route name cannot be empty.');

    const target = resolveCompany(company);
    const newRoute: Route = {
      id: generateUUID(),
      name: trimmed,
      company: target,
      created_at: new Date().toISOString(),
    };

    const tableName = target === 'Gopal Chips' ? 'gopal_routes' : 'dodla_routes';

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([{ id: newRoute.id, name: trimmed }])
        .select()
        .single();
      if (error) {
        console.error(`Supabase ${tableName} insert error:`, error);
        throw new Error(error.message || `Failed to add route in ${tableName}`);
      }
      if (data) {
        newRoute.id = data.id;
        newRoute.created_at = data.created_at;
      }
    }

    if (target === 'Gopal Chips') {
      const updated = [...gopalRoutes, newRoute];
      setGopalRoutes(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_ROUTES, JSON.stringify(updated));
    } else {
      const updated = [...dodlaRoutes, newRoute];
      setDodlaRoutes(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_ROUTES, JSON.stringify(updated));
    }

    return newRoute;
  };

  const deleteRoute = async (id: string): Promise<void> => {
    const isGopal = gopalRoutes.some((r) => r.id === id);
    const routeTable = isGopal ? 'gopal_routes' : 'dodla_routes';
    const shopTable = isGopal ? 'gopal_shops' : 'dodla_shops';

    if (isSupabaseConfigured() && supabase) {
      await supabase.from(shopTable).delete().eq('route_id', id);
      const { error } = await supabase.from(routeTable).delete().eq('id', id);
      if (error) {
        console.error(`Supabase ${routeTable} delete error:`, error);
        throw new Error(error.message || `Failed to delete route in ${routeTable}`);
      }
    }

    if (isGopal) {
      const updRoutes = gopalRoutes.filter((r) => r.id !== id);
      const updShops = gopalShops.filter((s) => s.route_id !== id);
      setGopalRoutes(updRoutes);
      setGopalShops(updShops);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_ROUTES, JSON.stringify(updRoutes));
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_SHOPS, JSON.stringify(updShops));
    } else {
      const updRoutes = dodlaRoutes.filter((r) => r.id !== id);
      const updShops = dodlaShops.filter((s) => s.route_id !== id);
      setDodlaRoutes(updRoutes);
      setDodlaShops(updShops);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_ROUTES, JSON.stringify(updRoutes));
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_SHOPS, JSON.stringify(updShops));
    }
  };

  // ----------------------------------------------------
  // SHOP ACTIONS
  // ----------------------------------------------------
  const addShop = async (shopData: Omit<Shop, 'id' | 'created_at'>): Promise<Shop> => {
    const isGopalRoute = gopalRoutes.some((r) => r.id === shopData.route_id);
    const target: CompanyDivision = isGopalRoute ? 'Gopal Chips' : resolveCompany(shopData.company);
    const tableName = target === 'Gopal Chips' ? 'gopal_shops' : 'dodla_shops';

    const newShop: Shop = {
      ...shopData,
      company: target,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([{
          id: newShop.id,
          route_id: shopData.route_id,
          name: shopData.name.trim(),
          phone: shopData.phone.trim(),
          address: shopData.address.trim(),
          incharge: shopData.incharge?.trim() || null,
          gstin: shopData.gstin?.trim() || null,
          fssai: shopData.fssai?.trim() || null,
        }])
        .select()
        .single();
      if (error) {
        console.error(`Supabase ${tableName} insert error:`, error);
        throw new Error(error.message || `Failed to add shop in ${tableName}`);
      }
      if (data) {
        newShop.id = data.id;
        newShop.created_at = data.created_at;
      }
    }

    if (target === 'Gopal Chips') {
      const updated = [...gopalShops, newShop];
      setGopalShops(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_SHOPS, JSON.stringify(updated));
    } else {
      const updated = [...dodlaShops, newShop];
      setDodlaShops(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_SHOPS, JSON.stringify(updated));
    }

    return newShop;
  };

  const deleteShop = async (id: string): Promise<void> => {
    const isGopal = gopalShops.some((s) => s.id === id);
    const tableName = isGopal ? 'gopal_shops' : 'dodla_shops';

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) {
        console.error(`Supabase ${tableName} delete error:`, error);
        throw new Error(error.message || `Failed to delete shop in ${tableName}`);
      }
    }

    if (isGopal) {
      const updated = gopalShops.filter((s) => s.id !== id);
      setGopalShops(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_SHOPS, JSON.stringify(updated));
    } else {
      const updated = dodlaShops.filter((s) => s.id !== id);
      setDodlaShops(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_SHOPS, JSON.stringify(updated));
    }
  };

  // ----------------------------------------------------
  // CATEGORY ACTIONS
  // ----------------------------------------------------
  const addCategory = async (name: string, hsnCode?: string, company?: CompanyDivision): Promise<Category> => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty.');

    const target = resolveCompany(company);
    const tableName = target === 'Gopal Chips' ? 'gopal_categories' : 'dodla_categories';
    const defaultHsn = target === 'Gopal Chips' ? '20052000' : '22029990';
    const trimmedHsn = hsnCode?.trim() || defaultHsn;

    const currentList = target === 'Gopal Chips' ? gopalCategories : dodlaCategories;
    const newCat: Category = {
      id: generateUUID(),
      name: trimmed,
      hsn_code: trimmedHsn,
      company: target,
      display_order: currentList.length + 1,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([{
          id: newCat.id,
          name: trimmed,
          hsn_code: trimmedHsn,
          display_order: newCat.display_order,
        }])
        .select()
        .single();
      if (error) {
        console.error(`Supabase ${tableName} insert error:`, error);
        throw new Error(error.message || `Failed to insert category in ${tableName}`);
      }
      if (data) {
        newCat.id = data.id;
        newCat.created_at = data.created_at;
        newCat.hsn_code = data.hsn_code;
      }
    }

    if (target === 'Gopal Chips') {
      const updated = [...gopalCategories, newCat];
      setGopalCategories(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_CATEGORIES, JSON.stringify(updated));
    } else {
      const updated = [...dodlaCategories, newCat];
      setDodlaCategories(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_CATEGORIES, JSON.stringify(updated));
    }

    return newCat;
  };

  const updateCategory = async (id: string, name: string, hsnCode?: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty.');

    const isGopal = gopalCategories.some((c) => c.id === id);
    const tableName = isGopal ? 'gopal_categories' : 'dodla_categories';

    const updates: { name: string; hsn_code?: string } = { name: trimmed };
    if (hsnCode !== undefined) {
      updates.hsn_code = hsnCode.trim();
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from(tableName).update(updates).eq('id', id);
      if (error) {
        console.error(`Supabase ${tableName} update error:`, error);
        throw new Error(error.message || `Failed to update category in ${tableName}`);
      }
    }

    if (isGopal) {
      const updated = gopalCategories.map((c) => (c.id === id ? { ...c, ...updates } : c));
      setGopalCategories(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_CATEGORIES, JSON.stringify(updated));
    } else {
      const updated = dodlaCategories.map((c) => (c.id === id ? { ...c, ...updates } : c));
      setDodlaCategories(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_CATEGORIES, JSON.stringify(updated));
    }
  };

  const deleteCategory = async (id: string): Promise<void> => {
    const isGopal = gopalCategories.some((c) => c.id === id);
    const catTable = isGopal ? 'gopal_categories' : 'dodla_categories';
    const prodTable = isGopal ? 'gopal_products' : 'dodla_products';
    const itemTable = isGopal ? 'gopal_order_items' : 'dodla_order_items';

    if (isSupabaseConfigured() && supabase) {
      // Find all products under this category
      const { data: dbProducts } = await supabase.from(prodTable).select('id').eq('category_id', id);
      const prodIds = (dbProducts || []).map((p: any) => p.id);

      if (prodIds.length > 0) {
        // Unlink order items first to preserve historical invoices
        await supabase.from(itemTable).update({ product_id: null }).in('product_id', prodIds);
        await supabase.from(prodTable).delete().eq('category_id', id);
      }

      const { error: catErr } = await supabase.from(catTable).delete().eq('id', id);
      if (catErr) {
        console.error(`Supabase ${catTable} delete error:`, catErr);
        throw new Error(catErr.message || `Failed to delete category in ${catTable}`);
      }
    }

    if (isGopal) {
      const updCats = gopalCategories.filter((c) => c.id !== id);
      const updProds = gopalProducts.filter((p) => p.category_id !== id);
      setGopalCategories(updCats);
      setGopalProducts(updProds);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_CATEGORIES, JSON.stringify(updCats));
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_PRODUCTS, JSON.stringify(updProds));
    } else {
      const updCats = dodlaCategories.filter((c) => c.id !== id);
      const updProds = dodlaProducts.filter((p) => p.category_id !== id);
      setDodlaCategories(updCats);
      setDodlaProducts(updProds);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_CATEGORIES, JSON.stringify(updCats));
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_PRODUCTS, JSON.stringify(updProds));
    }
  };

  // ----------------------------------------------------
  // PRODUCT ACTIONS
  // ----------------------------------------------------
  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const isGopalCat = gopalCategories.some((c) => c.id === productData.category_id);
    const target: CompanyDivision = isGopalCat ? 'Gopal Chips' : resolveCompany(productData.company);
    const tableName = target === 'Gopal Chips' ? 'gopal_products' : 'dodla_products';

    const newProd: Product = {
      ...productData,
      company: target,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([{
          id: newProd.id,
          category_id: productData.category_id,
          name: productData.name.trim(),
          hsn_code: productData.hsn_code?.trim() || (target === 'Gopal Chips' ? '20052000' : '22029990'),
          rate: productData.rate,
          stock_qty: productData.stock_qty,
          gst_rate: productData.gst_rate ?? 5.0,
          is_active: productData.is_active ?? true,
        }])
        .select()
        .single();
      if (error) {
        console.error(`Supabase ${tableName} insert error:`, error);
        throw new Error(error.message || `Failed to add product in ${tableName}`);
      }
      if (data) {
        newProd.id = data.id;
        newProd.created_at = data.created_at;
      }
    }

    if (target === 'Gopal Chips') {
      const updated = [...gopalProducts, newProd];
      setGopalProducts(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_PRODUCTS, JSON.stringify(updated));
    } else {
      const updated = [...dodlaProducts, newProd];
      setDodlaProducts(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_PRODUCTS, JSON.stringify(updated));
    }

    return newProd;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    const isGopal = gopalProducts.some((p) => p.id === id);
    const tableName = isGopal ? 'gopal_products' : 'dodla_products';

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.hsn_code !== undefined) dbUpdates.hsn_code = updates.hsn_code.trim();
    if (updates.rate !== undefined) dbUpdates.rate = updates.rate;
    if (updates.stock_qty !== undefined) dbUpdates.stock_qty = updates.stock_qty;
    if (updates.gst_rate !== undefined) dbUpdates.gst_rate = updates.gst_rate;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
    if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id;

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from(tableName).update(dbUpdates).eq('id', id);
      if (error) {
        console.error(`Supabase ${tableName} update error:`, error);
        throw new Error(error.message || `Failed to update product in ${tableName}`);
      }
    }

    if (isGopal) {
      const updated = gopalProducts.map((p) => (p.id === id ? { ...p, ...updates } : p));
      setGopalProducts(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_PRODUCTS, JSON.stringify(updated));
    } else {
      const updated = dodlaProducts.map((p) => (p.id === id ? { ...p, ...updates } : p));
      setDodlaProducts(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_PRODUCTS, JSON.stringify(updated));
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const isGopal = gopalProducts.some((p) => p.id === id);
    const prodTable = isGopal ? 'gopal_products' : 'dodla_products';
    const itemTable = isGopal ? 'gopal_order_items' : 'dodla_order_items';

    if (isSupabaseConfigured() && supabase) {
      // 1. Unlink product from order items so historical orders remain valid
      await supabase.from(itemTable).update({ product_id: null }).eq('product_id', id);

      // 2. Delete product from godown inventory table
      const { error } = await supabase.from(prodTable).delete().eq('id', id);
      if (error) {
        console.error(`Supabase ${prodTable} delete error:`, error);
        throw new Error(error.message || `Failed to delete product in ${prodTable}`);
      }
    }

    if (isGopal) {
      const updated = gopalProducts.filter((p) => p.id !== id);
      setGopalProducts(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_PRODUCTS, JSON.stringify(updated));
    } else {
      const updated = dodlaProducts.filter((p) => p.id !== id);
      setDodlaProducts(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_PRODUCTS, JSON.stringify(updated));
    }
  };

  const updateStock = async (productId: string, newStockQty: number): Promise<void> => {
    await updateProduct(productId, { stock_qty: Math.max(0, newStockQty) });
  };

  // ----------------------------------------------------
  // ORDER ACTIONS
  // ----------------------------------------------------
  const punchOrder = async (params: {
    routeId: string;
    routeName: string;
    shop: Shop;
    executiveId: string;
    executiveName: string;
    executivePhone: string;
    company?: CompanyDivision;
    items: { product: Product; qty: number }[];
  }): Promise<Order> => {
    const isGopalShop = gopalShops.some((s) => s.id === params.shop.id);
    const target: CompanyDivision = isGopalShop ? 'Gopal Chips' : resolveCompany(params.company || params.shop.company);

    const taxCalc = calculateOrderTax(
      params.items.map((i) => ({ qty: i.qty, rate: i.product.rate, gstRate: i.product.gst_rate }))
    );

    // Shared continuous invoice sequence across both Dodla and Gopal
    const allExistingOrders = [...dodlaOrders, ...gopalOrders];
    let maxInvoiceSeq = 0;
    for (const o of allExistingOrders) {
      if (o.invoice_no) {
        const m = o.invoice_no.match(/(\d+)$/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > maxInvoiceSeq) maxInvoiceSeq = num;
        }
      }
    }
    const currentSharedCount = Math.max(maxInvoiceSeq, allExistingOrders.length);
    const { orderNo, invoiceNo } = generateOrderNumbers(currentSharedCount);
    let orderId = generateUUID();

    const currentCategories = target === 'Gopal Chips' ? gopalCategories : dodlaCategories;
    const orderItems: OrderItem[] = params.items.map((item) => {
      const lineTaxable = Number((item.qty * item.product.rate).toFixed(2));
      const lineGst = Number(((lineTaxable * (item.product.gst_rate || 5.0)) / 100).toFixed(2));
      const matchedCat = currentCategories.find((c) => c.id === item.product.category_id);
      const effectiveHsn = item.product.hsn_code?.trim() || matchedCat?.hsn_code?.trim() || (target === 'Gopal Chips' ? '20052000' : '22029990');

      return {
        id: generateUUID(),
        order_id: orderId,
        product_id: item.product.id,
        product_name: item.product.name,
        category_name: matchedCat?.name || 'General',
        hsn_code: effectiveHsn,
        qty: item.qty,
        rate: item.product.rate,
        amount: lineTaxable,
        taxable_amount: lineTaxable,
        gst_rate: item.product.gst_rate || 5.0,
        gst_amount: lineGst,
        total_amount: Number((lineTaxable + lineGst).toFixed(2)),
        company: target,
      };
    });

    const newOrder: Order = {
      id: orderId,
      order_no: orderNo,
      invoice_no: invoiceNo,
      company: target,
      route_id: params.routeId,
      route_name: params.routeName,
      shop_id: params.shop.id,
      shop_name: params.shop.name,
      shop_phone: params.shop.phone,
      shop_address: params.shop.address,
      shop_gstin: params.shop.gstin,
      shop_fssai: params.shop.fssai,
      shop_incharge: params.shop.incharge,
      executive_id: params.executiveId,
      executive_name: params.executiveName,
      executive_phone: params.executivePhone,
      total_qty: taxCalc.totalQty,
      taxable_amount: taxCalc.taxableAmount,
      cgst_amount: taxCalc.cgstAmount,
      sgst_amount: taxCalc.sgstAmount,
      total_gst: taxCalc.totalGstAmount,
      round_off: taxCalc.roundOff,
      grand_total: taxCalc.grandTotal,
      status: 'pending',
      created_at: new Date().toISOString(),
      items: orderItems,
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const orderPayload = {
          order_no: newOrder.order_no,
          invoice_no: newOrder.invoice_no,
          route_id: newOrder.route_id,
          route_name: newOrder.route_name,
          shop_id: newOrder.shop_id,
          shop_name: newOrder.shop_name,
          shop_phone: newOrder.shop_phone,
          shop_address: newOrder.shop_address,
          shop_gstin: newOrder.shop_gstin || null,
          shop_fssai: newOrder.shop_fssai || null,
          shop_incharge: newOrder.shop_incharge || null,
          executive_id: newOrder.executive_id && !newOrder.executive_id.startsWith('usr_') ? newOrder.executive_id : null,
          executive_name: newOrder.executive_name,
          executive_phone: newOrder.executive_phone,
          total_qty: newOrder.total_qty,
          taxable_amount: newOrder.taxable_amount,
          cgst_amount: newOrder.cgst_amount,
          sgst_amount: newOrder.sgst_amount,
          total_gst: newOrder.total_gst,
          round_off: newOrder.round_off,
          grand_total: newOrder.grand_total,
        };

        const itemsPayload = orderItems.map((oi) => ({
          product_id: oi.product_id,
          product_name: oi.product_name,
          category_name: oi.category_name,
          hsn_code: oi.hsn_code,
          qty: oi.qty,
          rate: oi.rate,
          taxable_amount: oi.taxable_amount,
          gst_rate: oi.gst_rate,
          gst_amount: oi.gst_amount,
          total_amount: oi.total_amount,
        }));

        const rpcName = target === 'Gopal Chips' ? 'punch_gopal_order' : 'punch_dodla_order';
        const { data: rpcRes, error: rpcErr } = await supabase.rpc(rpcName, {
          p_order: orderPayload,
          p_items: itemsPayload,
        });

        if (rpcRes && rpcRes.id && !rpcErr) {
          orderId = rpcRes.id;
          newOrder.id = rpcRes.id;
          if (rpcRes.order_no) newOrder.order_no = rpcRes.order_no;
          if (rpcRes.invoice_no) newOrder.invoice_no = rpcRes.invoice_no;
          newOrder.items.forEach((it) => {
            it.order_id = rpcRes.id;
          });
        }
      } catch (e) {
        console.warn('Supabase atomic order punch error:', e);
      }
    }

    // Deduct stock in target company products
    if (target === 'Gopal Chips') {
      const updProds = gopalProducts.map((p) => {
        const ordItem = params.items.find((i) => i.product.id === p.id);
        return ordItem ? { ...p, stock_qty: Math.max(0, p.stock_qty - ordItem.qty) } : p;
      });
      setGopalProducts(updProds);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_PRODUCTS, JSON.stringify(updProds));

      const updOrders = [newOrder, ...gopalOrders];
      setGopalOrders(updOrders);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_ORDERS, JSON.stringify(updOrders));
    } else {
      const updProds = dodlaProducts.map((p) => {
        const ordItem = params.items.find((i) => i.product.id === p.id);
        return ordItem ? { ...p, stock_qty: Math.max(0, p.stock_qty - ordItem.qty) } : p;
      });
      setDodlaProducts(updProds);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_PRODUCTS, JSON.stringify(updProds));

      const updOrders = [newOrder, ...dodlaOrders];
      setDodlaOrders(updOrders);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_ORDERS, JSON.stringify(updOrders));
    }

    return newOrder;
  };

  const updateOrder = async (
    orderId: string,
    items: { product: Product; qty: number }[]
  ): Promise<Order> => {
    const isGopal = gopalOrders.some((o) => o.id === orderId);
    const existingOrder = (isGopal ? gopalOrders : dodlaOrders).find((o) => o.id === orderId);
    if (!existingOrder) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderTable = isGopal ? 'gopal_orders' : 'dodla_orders';
    const itemTable = isGopal ? 'gopal_order_items' : 'dodla_order_items';

    const activeItems = items.filter((i) => i.qty > 0);
    const taxCalc = calculateOrderTax(
      activeItems.map((i) => ({ qty: i.qty, rate: i.product.rate, gstRate: i.product.gst_rate }))
    );

    const currentCategories = isGopal ? gopalCategories : dodlaCategories;
    const updatedOrderItems: OrderItem[] = activeItems.map((item) => {
      const lineTaxable = Number((item.qty * item.product.rate).toFixed(2));
      const lineGst = Number(((lineTaxable * (item.product.gst_rate || 5.0)) / 100).toFixed(2));
      const matchedCat = currentCategories.find((c) => c.id === item.product.category_id);
      const effectiveHsn = item.product.hsn_code?.trim() || matchedCat?.hsn_code?.trim() || (isGopal ? '20052000' : '22029990');

      return {
        id: generateUUID(),
        order_id: orderId,
        product_id: item.product.id,
        product_name: item.product.name,
        category_name: matchedCat?.name || 'General',
        hsn_code: effectiveHsn,
        qty: item.qty,
        rate: item.product.rate,
        amount: lineTaxable,
        taxable_amount: lineTaxable,
        gst_rate: item.product.gst_rate || 5.0,
        gst_amount: lineGst,
        total_amount: Number((lineTaxable + lineGst).toFixed(2)),
        company: existingOrder.company,
      };
    });

    const updatedOrder: Order = {
      ...existingOrder,
      total_qty: taxCalc.totalQty,
      taxable_amount: taxCalc.taxableAmount,
      cgst_amount: taxCalc.cgstAmount,
      sgst_amount: taxCalc.sgstAmount,
      total_gst: taxCalc.totalGstAmount,
      round_off: taxCalc.roundOff,
      grand_total: taxCalc.grandTotal,
      items: updatedOrderItems,
    };

    if (isSupabaseConfigured() && supabase) {
      await supabase.from(itemTable).delete().eq('order_id', orderId);
      await supabase.from(orderTable).update({
        total_qty: updatedOrder.total_qty,
        taxable_amount: updatedOrder.taxable_amount,
        cgst_amount: updatedOrder.cgst_amount,
        sgst_amount: updatedOrder.sgst_amount,
        total_gst: updatedOrder.total_gst,
        round_off: updatedOrder.round_off,
        grand_total: updatedOrder.grand_total,
      }).eq('id', orderId);

      const itemsInsertPayload = updatedOrderItems.map((oi) => ({
        order_id: orderId,
        product_id: oi.product_id,
        product_name: oi.product_name,
        category_name: oi.category_name,
        hsn_code: oi.hsn_code,
        qty: oi.qty,
        rate: oi.rate,
        taxable_amount: oi.taxable_amount,
        gst_rate: oi.gst_rate,
        gst_amount: oi.gst_amount,
        total_amount: oi.total_amount,
      }));
      await supabase.from(itemTable).insert(itemsInsertPayload);
    }

    if (isGopal) {
      const updOrders = gopalOrders.map((o) => (o.id === orderId ? updatedOrder : o));
      setGopalOrders(updOrders);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_ORDERS, JSON.stringify(updOrders));
    } else {
      const updOrders = dodlaOrders.map((o) => (o.id === orderId ? updatedOrder : o));
      setDodlaOrders(updOrders);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_ORDERS, JSON.stringify(updOrders));
    }

    return updatedOrder;
  };

  const markOrderAsPrinted = async (orderId: string): Promise<void> => {
    const isGopal = gopalOrders.some((o) => o.id === orderId);
    const tableName = isGopal ? 'gopal_orders' : 'dodla_orders';
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      await supabase.from(tableName).update({ printed_at: now, status: 'printed' }).eq('id', orderId);
    }

    if (isGopal) {
      const updated = gopalOrders.map((o) => (o.id === orderId ? { ...o, printed_at: now, status: 'printed' as const } : o));
      setGopalOrders(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.GOPAL_ORDERS, JSON.stringify(updated));
    } else {
      const updated = dodlaOrders.map((o) => (o.id === orderId ? { ...o, printed_at: now, status: 'printed' as const } : o));
      setDodlaOrders(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.DODLA_ORDERS, JSON.stringify(updated));
    }
  };

  const clearAllOrders = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('dodla_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('gopal_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    setDodlaOrders([]);
    setGopalOrders([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.DODLA_ORDERS);
    await AsyncStorage.removeItem(STORAGE_KEYS.GOPAL_ORDERS);
  };

  const refreshData = async (): Promise<void> => {
    await loadAllData();
  };

  // ----------------------------------------------------
  // SCOPED VALUES EXPOSED TO CLIENTS
  // ----------------------------------------------------
  // If the active user is an executive, they only see their division's data.
  // If owner or no company restriction, return combined lists.
  const isExecutive = user?.role === 'executive';
  const executiveCompany = user?.company as CompanyDivision;

  const routes = useMemo(() => {
    if (isExecutive) {
      return executiveCompany === 'Gopal Chips' ? gopalRoutes : dodlaRoutes;
    }
    return [...dodlaRoutes, ...gopalRoutes];
  }, [isExecutive, executiveCompany, dodlaRoutes, gopalRoutes]);

  const shops = useMemo(() => {
    if (isExecutive) {
      return executiveCompany === 'Gopal Chips' ? gopalShops : dodlaShops;
    }
    return [...dodlaShops, ...gopalShops];
  }, [isExecutive, executiveCompany, dodlaShops, gopalShops]);

  const categories = useMemo(() => {
    if (isExecutive) {
      return executiveCompany === 'Gopal Chips' ? gopalCategories : dodlaCategories;
    }
    return [...dodlaCategories, ...gopalCategories];
  }, [isExecutive, executiveCompany, dodlaCategories, gopalCategories]);

  const products = useMemo(() => {
    if (isExecutive) {
      return executiveCompany === 'Gopal Chips' ? gopalProducts : dodlaProducts;
    }
    return [...dodlaProducts, ...gopalProducts];
  }, [isExecutive, executiveCompany, dodlaProducts, gopalProducts]);

  const orders = useMemo(() => {
    if (isExecutive) {
      return executiveCompany === 'Gopal Chips' ? gopalOrders : dodlaOrders;
    }
    return [...dodlaOrders, ...gopalOrders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [isExecutive, executiveCompany, dodlaOrders, gopalOrders]);

  return (
    <StoreContext.Provider
      value={{
        routes,
        shops,
        categories,
        products,
        orders,
        dodlaRoutes,
        gopalRoutes,
        dodlaShops,
        gopalShops,
        dodlaCategories,
        gopalCategories,
        dodlaProducts,
        gopalProducts,
        dodlaOrders,
        gopalOrders,
        isLoading,
        addRoute,
        deleteRoute,
        addShop,
        deleteShop,
        addCategory,
        updateCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        deleteProduct,
        updateStock,
        punchOrder,
        updateOrder,
        markOrderAsPrinted,
        clearAllOrders,
        refreshData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
