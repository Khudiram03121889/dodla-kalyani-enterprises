import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Route, Shop, Category, Product, Order, OrderItem } from '../types';
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
  addRoute: (name: string) => Promise<Route>;
  addShop: (shop: Omit<Shop, 'id' | 'created_at'>) => Promise<Shop>;
  addCategory: (name: string) => Promise<Category>;
  updateCategory: (id: string, name: string) => Promise<void>;
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
    items: { product: Product; qty: number }[];
  }) => Promise<Order>;
  updateOrder: (
    orderId: string,
    items: { product: Product; qty: number }[]
  ) => Promise<Order>;
  markOrderAsPrinted: (orderId: string) => Promise<void>;
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
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'COWL BAZAR' },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'CANTONMENT' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'GANDHI NAGAR' },
];

const SEED_SHOPS: Shop[] = [
  {
    id: '75fd1bf3-4b6b-42ca-b2d6-1a75555e2c60',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'SRI RAJESWARY HOT CHIPS',
    phone: '9945947413',
    address: 'COWL BAZAR, FIRST GATE - 583101',
    incharge: 'GADHILINGA',
  },
  {
    id: '5536adad-2ff7-4882-9e4c-428d553bd1d5',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'JALAN GENERAL STORES',
    phone: '7899421356',
    address: 'FIRST GATE NEAR COWL BAZAR - 583101',
    incharge: 'JALAN',
  },
  {
    id: 'f3f1b89f-f324-4489-8d09-28457f5a88f4',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'CHANDRA PAN SHOP',
    phone: '9164487440',
    address: 'FIRST GATE - 583101',
    incharge: 'CHANDRA',
  },
  {
    id: '95bfb50e-11ed-4eef-b81a-37651f1819f5',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'SRINIVAS GENERAL STORE',
    phone: '9563845210',
    address: 'FIRST GATE - 583101',
    incharge: 'SRINIVAS',
  },
  {
    id: '6d355d8b-1dbc-467c-8170-dd145ab5f34c',
    route_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'NAMAZ GENERAL STORE',
    phone: '8861211248',
    address: 'COWL BAZAR - 583101',
    incharge: 'NAMAZ',
  },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Dodla Milk & Curd', display_order: 1 },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Dodla Ghee & Butter', display_order: 2 },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Dodla Paneer & Sweets', display_order: 3 },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'Dodla Flavoured Milk', display_order: 4 },
  { id: 'c0000000-0000-0000-0000-000000000005', name: 'Beverages & Dairy Snacks', display_order: 5 },
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'f7fce4fe-9b63-45da-9a0a-a111cfa82923',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Dodla Toned Milk 500ml',
    hsn_code: '04012000',
    rate: 27.0,
    stock_qty: 150,
    gst_rate: 5.0,
  },
  {
    id: 'f8ece4b1-3bd2-4f5b-a137-efcae19d5ee8',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Dodla Full Cream Milk 500ml',
    hsn_code: '04012000',
    rate: 33.0,
    stock_qty: 120,
    gst_rate: 5.0,
  },
  {
    id: '332ecacd-807b-42d0-a5e2-4e78be8f6186',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Dodla Premium Curd 500g',
    hsn_code: '04031000',
    rate: 35.0,
    stock_qty: 80,
    gst_rate: 5.0,
  },
  {
    id: '87519930-149c-432b-9430-7cab29b028cc',
    category_id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Dodla Pure Cow Ghee 500ml',
    hsn_code: '04059020',
    rate: 340.0,
    stock_qty: 50,
    gst_rate: 5.0,
  },
  {
    id: '143c3777-f96d-4837-9ab2-679a6d80d073',
    category_id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Dodla Table Butter 100g',
    hsn_code: '04051000',
    rate: 58.0,
    stock_qty: 60,
    gst_rate: 5.0,
  },
  {
    id: '2284c34d-5d05-4ae4-bd52-f843863647a2',
    category_id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Dodla Fresh Paneer 200g',
    hsn_code: '04061000',
    rate: 95.0,
    stock_qty: 45,
    gst_rate: 5.0,
  },
  {
    id: '91329792-985d-4200-9ee6-7a1cc09e98e5',
    category_id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Dodla Doodh Peda 250g',
    hsn_code: '21069099',
    rate: 140.0,
    stock_qty: 30,
    gst_rate: 5.0,
  },
  {
    id: 'e54ab957-fce9-4c97-91c4-129064e0fc1e',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    name: 'Dodla Badam Milk 200ml Bottle',
    hsn_code: '22029990',
    rate: 35.0,
    stock_qty: 100,
    gst_rate: 5.0,
  },
  {
    id: 'ec985e41-3a18-4671-ae92-7e38c4307738',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    name: 'Dodla Pista Flavoured Milk 200ml',
    hsn_code: '22029990',
    rate: 35.0,
    stock_qty: 90,
    gst_rate: 5.0,
  },
  {
    id: 'c024b5bc-a45f-4ae9-a6ff-ac27853897d2',
    category_id: 'c0000000-0000-0000-0000-000000000005',
    name: 'Dodla Spiced Buttermilk 200ml Pouch',
    hsn_code: '04039010',
    rate: 12.0,
    stock_qty: 200,
    gst_rate: 5.0,
  },
];

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
          setRoutes(routesRes.data);
          await AsyncStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routesRes.data));
          remoteSuccess = true;
        }
        if (shopsRes.data && !shopsRes.error) {
          setShops(shopsRes.data);
          await AsyncStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shopsRes.data));
          remoteSuccess = true;
        }
        if (catsRes.data && !catsRes.error) {
          setCategories(catsRes.data);
          await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(catsRes.data));
          remoteSuccess = true;
        }
        if (prodsRes.data && !prodsRes.error) {
          setProducts(prodsRes.data);
          await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prodsRes.data));
          remoteSuccess = true;
        }
        if (ordersRes.data && !ordersRes.error) {
          // Read local orders to preserve any unsynced offline orders
          const savedOrders = await AsyncStorage.getItem(STORAGE_KEYS.ORDERS);
          const localOrders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];

          // Map remote order numbers
          const remoteOrderNos = new Set(ordersRes.data.map((o: any) => o.order_no));
          const unsyncedOrders = localOrders.filter((o) => !remoteOrderNos.has(o.order_no));

          // Merge: remote orders first + any unsynced local offline orders
          const mergedOrders = [...ordersRes.data, ...unsyncedOrders];

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

  const addRoute = async (name: string): Promise<Route> => {
    const trimmed = name.trim();
    const newRoute: Route = {
      id: generateUUID(),
      name: trimmed,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('dodla_routes').insert([{ name: trimmed }]).select().single();
        if (data && !error) newRoute.id = data.id;
      } catch (e) {
        console.warn('Supabase route insert error:', e);
      }
    }

    const updated = [...routes, newRoute];
    setRoutes(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(updated));
    return newRoute;
  };

  const addShop = async (shopData: Omit<Shop, 'id' | 'created_at'>): Promise<Shop> => {
    const newShop: Shop = {
      ...shopData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('dodla_shops').insert([shopData]).select().single();
        if (data && !error) newShop.id = data.id;
      } catch (e) {
        console.warn('Supabase shop insert error:', e);
      }
    }

    const updated = [...shops, newShop];
    setShops(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(updated));
    return newShop;
  };

  const addCategory = async (name: string): Promise<Category> => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Category name cannot be empty.');
    }

    const newCat: Category = {
      id: generateUUID(),
      name: trimmed,
      display_order: categories.length + 1,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('dodla_categories')
          .insert([{ id: newCat.id, name: trimmed, display_order: newCat.display_order }])
          .select()
          .single();
        if (error) {
          console.error('Supabase category insert error:', error);
          throw new Error(error.message || 'Failed to insert category in database');
        }
        if (data) {
          newCat.id = data.id;
          newCat.created_at = data.created_at;
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

  const updateCategory = async (id: string, name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Category name cannot be empty.');
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('dodla_categories').update({ name: trimmed }).eq('id', id);
      if (error) {
        console.error('Supabase category update error:', error);
        throw new Error(error.message || 'Failed to update category in database');
      }
    }

    const updated = categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c));
    setCategories(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
  };

  const deleteCategory = async (id: string): Promise<void> => {
    // 1. Check if any products use this category
    const linkedProducts = products.filter((p) => p.category_id === id);
    if (linkedProducts.length > 0) {
      const names = linkedProducts.map((p) => `"${p.name}"`).join(', ');
      throw new Error(`Cannot delete category because ${linkedProducts.length} product(s) belong to it: ${names}. Delete or reassign the products first.`);
    }

    // 2. Perform Supabase deletion
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('dodla_categories').delete().eq('id', id);
      if (error) {
        console.error('Supabase category delete error:', error);
        throw new Error(error.message || 'Failed to delete category in database');
      }
    }

    // 3. Update local state
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const newProd: Product = {
      ...productData,
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
    items: { product: Product; qty: number }[];
  }): Promise<Order> => {
    // 1. Calculate tax and totals
    const taxCalc = calculateOrderTax(
      params.items.map((i) => ({ qty: i.qty, rate: i.product.rate, gstRate: i.product.gst_rate }))
    );

    const { orderNo, invoiceNo } = generateOrderNumbers(orders.length);
    let orderId = generateUUID();

    // 2. Prepare Order Items
    const orderItems: OrderItem[] = params.items.map((item) => {
      const lineTaxable = Number((item.qty * item.product.rate).toFixed(2));
      const lineGst = Number(((lineTaxable * (item.product.gst_rate || 5.0)) / 100).toFixed(2));
      const matchedCat = categories.find((c) => c.id === item.product.category_id);

      return {
        id: generateUUID(),
        order_id: orderId,
        product_id: item.product.id,
        product_name: item.product.name,
        category_name: matchedCat?.name || 'General',
        hsn_code: item.product.hsn_code,
        qty: item.qty,
        rate: item.product.rate,
        amount: lineTaxable,
        taxable_amount: lineTaxable,
        gst_rate: item.product.gst_rate || 5.0,
        gst_amount: lineGst,
        total_amount: Number((lineTaxable + lineGst).toFixed(2)),
      };
    });

    // 3. Create full Order object
    const newOrder: Order = {
      id: orderId,
      order_no: orderNo,
      invoice_no: invoiceNo,
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

      return {
        id: generateUUID(),
        order_id: orderId,
        product_id: item.product.id,
        product_name: item.product.name,
        category_name: matchedCat?.name || 'General',
        hsn_code: item.product.hsn_code,
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
        addShop,
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

