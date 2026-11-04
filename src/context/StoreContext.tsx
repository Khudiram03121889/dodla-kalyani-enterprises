import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Route, Shop, Category, Product, Order, OrderItem, CompanyDivision } from '../types';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { calculateOrderTax } from '../utils/taxCalculator';
import { generateOrderNumbers } from '../utils/formatters';

interface StoreContextType {
  routes: Route[];
  shops: Shop[];
  categories: Category[];
  products: Product[];
  orders: Order[];
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
  ROUTES: '@dodla_routes',
  SHOPS: '@dodla_shops',
  CATEGORIES: '@dodla_categories',
  PRODUCTS: '@dodla_products',
  ORDERS: '@dodla_orders',
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initial Seed Data (Fallback when offline & first launch)
const SEED_ROUTES: Route[] = [
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'COWL BAZAR', company: 'Dodla' },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'CANTONMENT', company: 'Dodla' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'GANDHI NAGAR', company: 'Dodla' },
  { id: 'g0000000-0000-0000-0000-000000000001', name: 'MAIN MARKET', company: 'Gopal Chips' },
  { id: 'g0000000-0000-0000-0000-000000000002', name: 'STATION ROAD', company: 'Gopal Chips' },
];

const SEED_SHOPS: Shop[] = [
  {
    id: '75fd1bf3-4b6b-42ca-b2d6-1a75555e2c60',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'SRI RAJESWARY HOT CHIPS',
    phone: '9945947413',
    address: 'COWL BAZAR, FIRST GATE - 583101',
    incharge: 'GADHILINGA',
    company: 'Dodla',
  },
  {
    id: '5536adad-2ff7-4882-9e4c-428d553bd1d5',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'JALAN GENERAL STORES',
    phone: '7899421356',
    address: 'FIRST GATE NEAR COWL BAZAR - 583101',
    incharge: 'JALAN',
    company: 'Dodla',
  },
  {
    id: 'f3f1b89f-f324-4489-8d09-28457f5a88f4',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'CHANDRA PAN SHOP',
    phone: '9164487440',
    address: 'FIRST GATE - 583101',
    incharge: 'CHANDRA',
    company: 'Dodla',
  },
  {
    id: '95bfb50e-11ed-4eef-b81a-37651f1819f5',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'SRINIVAS GENERAL STORE',
    phone: '9563845210',
    address: 'FIRST GATE - 583101',
    incharge: 'SRINIVAS',
    company: 'Dodla',
  },
  {
    id: '6d355d8b-1dbc-467c-8170-dd145ab5f34c',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'NAMAZ GENERAL STORE',
    phone: '8861211248',
    address: 'COWL BAZAR - 583101',
    incharge: 'NAMAZ',
    company: 'Dodla',
  },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Badam Milk', hsn_code: '22029990', display_order: 1, company: 'Dodla' },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Soan Papdi', hsn_code: '21069099', display_order: 2, company: 'Dodla' },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Gulab Jamun', hsn_code: '21069099', display_order: 3, company: 'Dodla' },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'Doodh Pedha', hsn_code: '21069099', display_order: 4, company: 'Dodla' },
  { id: 'g0000000-0000-0000-0000-000000000001', name: 'Gopal Potato Chips', hsn_code: '20052000', display_order: 5, company: 'Gopal Chips' },
  { id: 'g0000000-0000-0000-0000-000000000002', name: 'Gopal Namkeen & Snacks', hsn_code: '21069099', display_order: 6, company: 'Gopal Chips' },
];

const SEED_PRODUCTS: Product[] = [];

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    let remoteSuccess = false;

    // 1. Fetch from Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const [routesRes, shopsRes, catsRes, prodsRes, ordersRes] = await Promise.all([
          supabase.from('dodla_routes').select('*').order('name'),
          supabase.from('dodla_shops').select('*').order('name'),
          supabase.from('dodla_categories').select('*').order('display_order'),
          supabase.from('dodla_products').select('*').order('name'),
          supabase.from('dodla_orders').select('*, items:dodla_order_items(*)').order('created_at', { ascending: false }),
        ]);

        if (routesRes.data && !routesRes.error) {
          const normRoutes: Route[] = routesRes.data.map((r: any) => ({ ...r, company: (r.company as CompanyDivision) || 'Dodla' }));
          setRoutes(normRoutes);
          await AsyncStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(normRoutes));
          remoteSuccess = true;
        }
        if (shopsRes.data && !shopsRes.error) {
          const normShops: Shop[] = shopsRes.data.map((s: any) => ({ ...s, company: (s.company as CompanyDivision) || 'Dodla' }));
          setShops(normShops);
          await AsyncStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(normShops));
          remoteSuccess = true;
        }
        if (catsRes.data && !catsRes.error) {
          const normCats: Category[] = catsRes.data.map((c: any) => ({ ...c, company: (c.company as CompanyDivision) || 'Dodla' }));
          setCategories(normCats);
          await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(normCats));
          remoteSuccess = true;
        }
        if (prodsRes.data && !prodsRes.error) {
          const normProds: Product[] = prodsRes.data.map((p: any) => ({ ...p, company: (p.company as CompanyDivision) || 'Dodla' }));
          setProducts(normProds);
          await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normProds));
          remoteSuccess = true;
        }
        if (ordersRes.data && !ordersRes.error) {
          // Read local orders to preserve any unsynced offline orders
          const savedOrders = await AsyncStorage.getItem(STORAGE_KEYS.ORDERS);
          const localOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];

          const remoteOrders: Order[] = ordersRes.data.map((o: any) => ({
            ...o,
            company: (o.company as CompanyDivision) || 'Dodla',
          }));

          // Map remote order numbers
          const remoteOrderNos = new Set(remoteOrders.map((o: any) => o.order_no));
          const unsyncedOrders = localOrders.filter((o) => !remoteOrderNos.has(o.order_no));

          // Merge: remote orders first + any unsynced local offline orders
          const mergedOrders = [...remoteOrders, ...unsyncedOrders];

          setOrders(mergedOrders);
          await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(mergedOrders));
          remoteSuccess = true;

          // Background sync unsynced orders to Supabase
          if (unsyncedOrders.length > 0) {
            (async () => {
              for (const offOrder of unsyncedOrders) {
                try {
                  const offOrderPayload = {
                    order_no: offOrder.order_no,
                    invoice_no: offOrder.invoice_no,
                    route_id: offOrder.route_id,
                    route_name: offOrder.route_name,
                    shop_id: offOrder.shop_id,
                    shop_name: offOrder.shop_name,
                    shop_phone: offOrder.shop_phone,
                    shop_address: offOrder.shop_address,
                    shop_gstin: offOrder.shop_gstin || null,
                    shop_fssai: offOrder.shop_fssai || null,
                    shop_incharge: offOrder.shop_incharge || null,
                    executive_id: offOrder.executive_id && !offOrder.executive_id.startsWith('usr_') ? offOrder.executive_id : null,
                    executive_name: offOrder.executive_name,
                    executive_phone: offOrder.executive_phone,
                    total_qty: offOrder.total_qty,
                    taxable_amount: offOrder.taxable_amount,
                    cgst_amount: offOrder.cgst_amount,
                    sgst_amount: offOrder.sgst_amount,
                    total_gst: offOrder.total_gst,
                    round_off: offOrder.round_off,
                    grand_total: offOrder.grand_total,
                  };
                  const offItemsPayload = (offOrder.items || []).map((oi) => ({
                    product_id: oi.product_id,
                    product_name: oi.product_name,
                    category_name: oi.category_name,
                    qty: oi.qty,
                    rate: oi.rate,
                    taxable_amount: oi.taxable_amount,
                    gst_rate: oi.gst_rate,
                    gst_amount: oi.gst_amount,
                    total_amount: oi.total_amount,
                  }));
                  await supabase.rpc('punch_dodla_order', {
                    p_order: offOrderPayload,
                    p_items: offItemsPayload,
                  });
                } catch (syncErr) {
                  console.warn('Sync error for offline order:', offOrder.order_no, syncErr);
                }
              }
            })();
          }
        }

        if (remoteSuccess) {
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Supabase remote fetch failed, loading local store:', e);
      }
    }

    // 2. Load from Local AsyncStorage or Seed Data
    try {
      const [savedRoutes, savedShops, savedCats, savedProds, savedOrders] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ROUTES),
        AsyncStorage.getItem(STORAGE_KEYS.SHOPS),
        AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES),
        AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS),
        AsyncStorage.getItem(STORAGE_KEYS.ORDERS),
      ]);

      const initialRoutes = savedRoutes ? JSON.parse(savedRoutes) : SEED_ROUTES;
      const initialShops = savedShops ? JSON.parse(savedShops) : SEED_SHOPS;
      
      // Sanitize categories: if legacy dummy categories are detected, use SEED_CATEGORIES
      let initialCats: Category[] = SEED_CATEGORIES;
      if (savedCats) {
        try {
          const parsed = JSON.parse(savedCats);
          const hasLegacyDummy = parsed.some((c: Category) => c.name === 'Soan Papdi' || c.name === 'Gulab Jamun' || c.name === 'Doodh Pedha');
          if (!hasLegacyDummy && Array.isArray(parsed) && parsed.length > 0) {
            initialCats = parsed;
          }
        } catch {
          initialCats = SEED_CATEGORIES;
        }
      }

      let initialProds: Product[] = SEED_PRODUCTS;
      if (savedProds) {
        try {
          const parsed = JSON.parse(savedProds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialProds = parsed;
          }
        } catch {
          initialProds = SEED_PRODUCTS;
        }
      }

      const initialOrders = savedOrders ? JSON.parse(savedOrders) : [];

      setRoutes(initialRoutes);
      setShops(initialShops);
      setCategories(initialCats);
      setProducts(initialProds);
      setOrders(initialOrders);

      await AsyncStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(initialRoutes));
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(initialShops));
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(initialCats));
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProds));
      if (!savedOrders) await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(initialOrders));
    } catch (err) {
      console.warn('Error loading local store data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addRoute = async (name: string, company: CompanyDivision = 'Dodla'): Promise<Route> => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Route name cannot be empty.');
    }

    const newRoute: Route = {
      id: generateUUID(),
      name: trimmed,
      company,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('dodla_routes')
          .insert([{ id: newRoute.id, name: trimmed, company }])
          .select()
          .single();
        if (error) {
          console.error('Supabase route insert error:', error);
          throw new Error(error.message || 'Failed to add route in database');
        }
        if (data) {
          newRoute.id = data.id;
          newRoute.created_at = data.created_at;
          newRoute.company = data.company || company;
        }
      } catch (e: any) {
        console.error('addRoute error:', e);
        throw e;
      }
    }

    const updated = [...routes, newRoute];
    setRoutes(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(updated));
    return newRoute;
  };

  const deleteRoute = async (id: string): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      // 1. Delete associated shops in Supabase
      const { error: shopErr } = await supabase.from('dodla_shops').delete().eq('route_id', id);
      if (shopErr) {
        console.error('Supabase delete route shops error:', shopErr);
      }

      // 2. Delete route in Supabase
      const { error } = await supabase.from('dodla_routes').delete().eq('id', id);
      if (error) {
        console.error('Supabase delete route error:', error);
        throw new Error(error.message || 'Failed to delete route in database');
      }
    }

    // 3. Update local state
    const updatedRoutes = routes.filter((r) => r.id !== id);
    const updatedShops = shops.filter((s) => s.route_id !== id);
    setRoutes(updatedRoutes);
    setShops(updatedShops);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(updatedRoutes));
    await AsyncStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(updatedShops));
  };

  const addShop = async (shopData: Omit<Shop, 'id' | 'created_at'>): Promise<Shop> => {
    const parentRoute = routes.find((r) => r.id === shopData.route_id);
    const effectiveCompany: CompanyDivision = shopData.company || parentRoute?.company || 'Dodla';

    const newShop: Shop = {
      ...shopData,
      company: effectiveCompany,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('dodla_shops')
          .insert([{
            id: newShop.id,
            route_id: shopData.route_id,
            name: shopData.name.trim(),
            phone: shopData.phone.trim(),
            address: shopData.address.trim(),
            incharge: shopData.incharge?.trim() || null,
            gstin: shopData.gstin?.trim() || null,
            fssai: shopData.fssai?.trim() || null,
            company: effectiveCompany,
          }])
          .select()
          .single();
        if (error) {
          console.error('Supabase shop insert error:', error);
          throw new Error(error.message || 'Failed to add shop in database');
        }
        if (data) {
          newShop.id = data.id;
          newShop.created_at = data.created_at;
          newShop.company = data.company || effectiveCompany;
        }
      } catch (e: any) {
        console.error('addShop error:', e);
        throw e;
      }
    }

    const updated = [...shops, newShop];
    setShops(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(updated));
    return newShop;
  };

  const deleteShop = async (id: string): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('dodla_shops').delete().eq('id', id);
      if (error) {
        console.error('Supabase delete shop error:', error);
        throw new Error(error.message || 'Failed to delete shop in database');
      }
    }

    const updated = shops.filter((s) => s.id !== id);
    setShops(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(updated));
  };

  const addCategory = async (name: string, hsnCode?: string, company: CompanyDivision = 'Dodla'): Promise<Category> => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Category name cannot be empty.');
    }

    const defaultHsn = company === 'Gopal Chips' ? '20052000' : '04012000';
    const trimmedHsn = hsnCode?.trim() || defaultHsn;

    const newCat: Category = {
      id: generateUUID(),
      name: trimmed,
      hsn_code: trimmedHsn,
      company,
      display_order: categories.length + 1,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('dodla_categories')
          .insert([{
            id: newCat.id,
            name: trimmed,
            hsn_code: trimmedHsn,
            display_order: newCat.display_order,
            company,
          }])
          .select()
          .single();
        if (error) {
          console.error('Supabase category insert error:', error);
          throw new Error(error.message || 'Failed to insert category in database');
        }
        if (data) {
          newCat.id = data.id;
          newCat.created_at = data.created_at;
          newCat.hsn_code = data.hsn_code;
          newCat.company = data.company || company;
        }
      } catch (e: any) {
        console.error('addCategory error:', e);
        throw e;
      }
    }

    const updated = [...categories, newCat];
    setCategories(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    return newCat;
  };

  const updateCategory = async (id: string, name: string, hsnCode?: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Category name cannot be empty.');
    }

    const updates: { name: string; hsn_code?: string } = { name: trimmed };
    if (hsnCode !== undefined) {
      updates.hsn_code = hsnCode.trim();
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('dodla_categories').update(updates).eq('id', id);
      if (error) {
        console.error('Supabase category update error:', error);
        throw new Error(error.message || 'Failed to update category in database');
      }
    }

    const updated = categories.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setCategories(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
  };

  const deleteCategory = async (id: string): Promise<void> => {
    // 1. Perform Supabase deletion
    if (isSupabaseConfigured() && supabase) {
      // Find all products in Supabase under this category
      const { data: dbProducts } = await supabase
        .from('dodla_products')
        .select('id')
        .eq('category_id', id);

      const allProductIds = Array.from(
        new Set([
          ...products.filter((p) => p.category_id === id).map((p) => p.id),
          ...(dbProducts || []).map((p: any) => p.id),
        ])
      );

      // If category has products, unlink them from order items and delete them
      if (allProductIds.length > 0) {
        const { error: unlinkError } = await supabase
          .from('dodla_order_items')
          .update({ product_id: null })
          .in('product_id', allProductIds);
        if (unlinkError) {
          console.error('Supabase unlink category products order items error:', unlinkError);
        }

        const { error: prodDeleteError } = await supabase
          .from('dodla_products')
          .delete()
          .eq('category_id', id);
        if (prodDeleteError) {
          console.error('Supabase category products delete error:', prodDeleteError);
          throw new Error(prodDeleteError.message || 'Failed to delete products under category');
        }
      }

      // Delete the category itself
      const { error: catDeleteError } = await supabase
        .from('dodla_categories')
        .delete()
        .eq('id', id);
      if (catDeleteError) {
        console.error('Supabase category delete error:', catDeleteError);
        throw new Error(catDeleteError.message || 'Failed to delete category in database');
      }
    }

    // 2. Update local state
    const updatedCategories = categories.filter((c) => c.id !== id);
    const updatedProducts = products.filter((p) => p.category_id !== id);
    setCategories(updatedCategories);
    setProducts(updatedProducts);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updatedCategories));
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const parentCat = categories.find((c) => c.id === productData.category_id);
    const effectiveCompany: CompanyDivision = productData.company || parentCat?.company || 'Dodla';

    const newProd: Product = {
      ...productData,
      company: effectiveCompany,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('dodla_products')
          .insert([{
            id: newProd.id,
            category_id: productData.category_id,
            name: productData.name,
            hsn_code: productData.hsn_code,
            rate: productData.rate,
            stock_qty: productData.stock_qty,
            gst_rate: productData.gst_rate,
            company: effectiveCompany,
          }])
          .select()
          .single();
        if (error) {
          console.error('Supabase product insert error:', error);
          throw new Error(error.message || 'Failed to insert product in database');
        }
        if (data) {
          newProd.id = data.id;
          newProd.created_at = data.created_at;
          newProd.company = data.company || effectiveCompany;
        }
      } catch (e: any) {
        console.error('addProduct error:', e);
        throw e;
      }
    }

    const updated = [...products, newProd];
    setProducts(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    return newProd;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('dodla_products').update(updates).eq('id', id);
      if (error) {
        console.error('Supabase product update error:', error);
        throw new Error(error.message || 'Failed to update product in database');
      }
    }

    const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProducts(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
  };

  const deleteProduct = async (id: string): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      // 1. Unlink product from order items so foreign key constraint does not fail.
      // Order items retain product_name, category_name, qty, rate, tax, amounts for invoice records.
      const { error: unlinkError } = await supabase
        .from('dodla_order_items')
        .update({ product_id: null })
        .eq('product_id', id);
      if (unlinkError) {
        console.error('Supabase unlink product order items error:', unlinkError);
      }

      // 2. Delete product from database
      const { error } = await supabase.from('dodla_products').delete().eq('id', id);
      if (error) {
        console.error('Supabase product delete error:', error);
        throw new Error(error.message || 'Failed to delete product in database');
      }
    }

    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
  };

  const updateStock = async (productId: string, newStockQty: number): Promise<void> => {
    await updateProduct(productId, { stock_qty: Math.max(0, newStockQty) });
  };

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
    // 1. Calculate tax and totals
    const taxCalc = calculateOrderTax(
      params.items.map((i) => ({ qty: i.qty, rate: i.product.rate, gstRate: i.product.gst_rate }))
    );

    const effectiveCompany: CompanyDivision =
      params.company || (params.shop.company as CompanyDivision) || 'Dodla';

    const { orderNo, invoiceNo } = generateOrderNumbers(orders.length);
    let orderId = generateUUID();

    // 2. Prepare Order Items
    const orderItems: OrderItem[] = params.items.map((item) => {
      const lineTaxable = Number((item.qty * item.product.rate).toFixed(2));
      const lineGst = Number(((lineTaxable * (item.product.gst_rate || 5.0)) / 100).toFixed(2));
      const matchedCat = categories.find((c) => c.id === item.product.category_id);
      const effectiveHsn = item.product.hsn_code?.trim() || matchedCat?.hsn_code?.trim() || (effectiveCompany === 'Gopal Chips' ? '20052000' : '04012000');

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
        company: effectiveCompany,
      };
    });

    // 3. Create full Order object
    const newOrder: Order = {
      id: orderId,
      order_no: orderNo,
      invoice_no: invoiceNo,
      company: effectiveCompany,
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

    // 4. Try pushing to Supabase via atomic stored procedure
    if (isSupabaseConfigured() && supabase) {
      try {
        const orderPayload = {
          order_no: newOrder.order_no,
          invoice_no: newOrder.invoice_no,
          company: effectiveCompany,
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

        const { data: rpcRes, error: rpcErr } = await supabase.rpc('punch_dodla_order', {
          p_order: orderPayload,
          p_items: itemsPayload,
        });

        if (rpcRes && rpcRes.id && !rpcErr) {
          orderId = rpcRes.id;
          newOrder.id = rpcRes.id;
          if (rpcRes.order_no) newOrder.order_no = rpcRes.order_no;
          if (rpcRes.invoice_no) newOrder.invoice_no = rpcRes.invoice_no;
          newOrder.items.forEach((item) => {
            item.order_id = rpcRes.id;
          });
        }
      } catch (e) {
        console.warn('Supabase atomic order punch error:', e);
      }
    }

    // 5. Deduct Stock in Local Godown State
    const updatedProducts = products.map((p) => {
      const ordered = params.items.find((i) => i.product.id === p.id);
      if (ordered) {
        return { ...p, stock_qty: Math.max(0, p.stock_qty - ordered.qty) };
      }
      return p;
    });

    setProducts(updatedProducts);
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

    // 6. Update local orders
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));

    return newOrder;
  };

  const updateOrder = async (
    orderId: string,
    items: { product: Product; qty: number }[]
  ): Promise<Order> => {
    const existingOrder = orders.find((o) => o.id === orderId);
    if (!existingOrder) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 1. Calculate tax and totals with updated items
    const activeItems = items.filter((i) => i.qty > 0);
    const taxCalc = calculateOrderTax(
      activeItems.map((i) => ({
        qty: i.qty,
        rate: i.product.rate,
        gstRate: i.product.gst_rate,
      }))
    );

    // 2. Prepare updated Order Items
    const updatedOrderItems: OrderItem[] = activeItems.map((item) => {
      const lineTaxable = Number((item.qty * item.product.rate).toFixed(2));
      const lineGst = Number(((lineTaxable * (item.product.gst_rate || 5.0)) / 100).toFixed(2));
      const matchedCat = categories.find((c) => c.id === item.product.category_id);
      const effectiveHsn = item.product.hsn_code?.trim() || matchedCat?.hsn_code?.trim() || '04012000';

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
      };
    });

    // 3. Adjust Stock in Godown: compare old order qty vs new order qty
    const oldQtyMap: Record<string, number> = {};
    (existingOrder.items || []).forEach((oi) => {
      oldQtyMap[oi.product_id] = (oldQtyMap[oi.product_id] || 0) + oi.qty;
    });

    const newQtyMap: Record<string, number> = {};
    activeItems.forEach((ai) => {
      newQtyMap[ai.product.id] = (newQtyMap[ai.product.id] || 0) + ai.qty;
    });

    const updatedProducts = products.map((p) => {
      const oldQty = oldQtyMap[p.id] || 0;
      const newQty = newQtyMap[p.id] || 0;
      const delta = oldQty - newQty; // If new is higher, stock decreases; if new is lower, stock increases
      if (delta !== 0) {
        return { ...p, stock_qty: Math.max(0, p.stock_qty + delta) };
      }
      return p;
    });

    setProducts(updatedProducts);
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

    // 4. Create updated Order object
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

    // 5. Update local orders state
    const updatedOrders = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    setOrders(updatedOrders);
    await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));

    // 6. Push updates to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('dodla_orders')
          .update({
            total_qty: updatedOrder.total_qty,
            taxable_amount: updatedOrder.taxable_amount,
            cgst_amount: updatedOrder.cgst_amount,
            sgst_amount: updatedOrder.sgst_amount,
            total_gst: updatedOrder.total_gst,
            round_off: updatedOrder.round_off,
            grand_total: updatedOrder.grand_total,
          })
          .eq('id', orderId);

        // Delete old items and insert updated items
        await supabase.from('dodla_order_items').delete().eq('order_id', orderId);
        const supabaseItemsPayload = updatedOrderItems.map((oi) => ({
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
        await supabase.from('dodla_order_items').insert(supabaseItemsPayload);
      } catch (e) {
        console.warn('Supabase update order error:', e);
      }
    }

    return updatedOrder;
  };

  const markOrderAsPrinted = async (orderId: string): Promise<void> => {
    const updated = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'printed' as const,
            printed_at: new Date().toISOString(),
          }
        : o
    );
    setOrders(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('dodla_orders')
          .update({ status: 'printed', printed_at: new Date().toISOString() })
          .eq('id', orderId);
      } catch (e) {
        console.warn('Supabase mark order printed error:', e);
      }
    }
  };

  const clearAllOrders = async (): Promise<void> => {
    try {
      setOrders([]);
      await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));

      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase
            .from('dodla_order_items')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase
            .from('dodla_orders')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (supaErr) {
          console.warn('Supabase clear orders error:', supaErr);
        }
      }
    } catch (err) {
      console.warn('Error clearing orders:', err);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        routes,
        shops,
        categories,
        products,
        orders,
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
        refreshData: loadAllData,
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

