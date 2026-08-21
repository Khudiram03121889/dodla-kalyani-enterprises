# Dodla Mobile Sales & Billing App (Kalyani Enterprises)

**Dodla** is a field sales order-taking, stock tracking, and Tax Invoice distribution app built for **Kalyani Enterprises** using **React Native**, **Expo SDK 52**, and **Supabase**.

---

## 🚀 Key Features

### 🚚 Executive Workflow
1. **Route & Shop Selection**:
   - Filter shops across routes (e.g. `COWL BAZAR`, `CANTONMENT`, `GANDHI NAGAR`).
   - Quick search by Shop Name, Address, or Mobile Number.
2. **3-Line Quick Actions Menu**:
   - **Add Route**: Add new routes on the go.
   - **Add Shop**: Register shops with mandatory fields (Name, Phone, Address) and optional fields (GSTIN, FSSAI License, Contact Person).
3. **Godown Order Punching**:
   - Browse items present in the Godown across dynamic owner categories.
   - Live Godown stock indicators.
   - **Strict Stock Enforcement**: Order quantity cannot exceed available stock in Godown.
   - Real-time tax computation (5% GST breakdown: 2.5% CGST + 2.5% SGST, rounding, total).
   - **Punch Order**: Decrements Godown stock and sends bill to the Owner's Sales Dashboard.

---

### 👑 Owner Workflow
1. **Godown Inventory & Dynamic Categories**:
   - Create and manage custom categories (e.g. Milk & Curd, Ghee & Butter, Paneer, Sweets, etc.).
   - Add items with fixed selling rates and initial Godown stock.
   - Uniform 5% GST automatically applied.
   - Quick Restock / Stock Adjustment modal.
2. **Sales Dashboard**:
   - Real-time KPI Cards: Total Punches, Pending to Print (count & ₹), Already Printed (count & ₹), and Total Revenue.
   - **Pending Invoices**: Live list of field punches awaiting printing.
   - **"Mark as Printed" Checkbox**: Ticking moves bills from Pending into Printed History.
3. **Kalyani Enterprises Tax Invoice (Reference: AUG 20.pdf)**:
   - Pixel-perfect Tax Invoice with embedded `kalyani_enterprise_logo.png`.
   - Complete company header (GST: `29EMLPM3821E1ZW`, FSSAI: `20250930107794088`, Phone: `9980723548`, Ballari, Karnataka).
   - Dynamic party details.
   - Table columns: `Sr.No.`, `Product Name`, `Qty`, `Rate`, `Total Amount`, `Taxable Amt`, `GST % (5%)`, `GST Amt`, `Total`.
   - **Discount column removed** as requested.
   - Category quantity summary box.
   - CGST / SGST split, Round Off, Grand Total ₹, and Amount in Words (Indian Rupees).
   - 1-click **Print** or **Share as PDF / WhatsApp**.
4. **Route Consolidated Summary Sheet (Page 39 Reference)**:
   - Consolidated list of bills for a selected route with Bill No, Party Name, Mobile No, and Total Route Amount.

---

## 🔐 Default Credentials for Testing

| Role | Username (Phone Number) | Password | Full Name |
| :--- | :--- | :--- | :--- |
| **Owner** | `9900426623` | `kalyani1975` | Kalyani Enterprises Owner |
| **Executive** | `9538344788` | `exec123` | Bharath Kumar |

*Note: Quick demo sign-in chips are also provided directly on the login screen.*

---

## 🛠️ Supabase Setup & `.env` Configuration

1. Create a project in [Supabase](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard and run the script in:
   - [supabase/schema.sql](file:///d:/Dodla%20for%20Kalyani%20Enterprises/supabase/schema.sql) (creates tables and RLS policies)
   - [supabase/seed.sql](file:///d:/Dodla%20for%20Kalyani%20Enterprises/supabase/seed.sql) (seeds default users, routes, shops, and products)
3. Copy your **Project URL** and **Anon Public Key** from Supabase (`Settings` -> `API`).
4. Paste them into the [.env](file:///d:/Dodla%20for%20Kalyani%20Enterprises/.env) file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   EXPO_PUBLIC_ENABLE_LOCAL_FALLBACK=true
   ```

*Note: Even before setting Supabase credentials, the app includes high-reliability offline-first persistence (`AsyncStorage`) with pre-seeded data so you can test all features immediately.*

---

## 📱 Running the App

```bash
# Start Metro bundler
npm start

# Run on Android / BlueStacks / Device
npm run android

# Run on Web Browser
npm run web
```
