import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Boxes,
  CreditCard,
  Edit3,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  ReceiptText,
  Store,
  ShoppingCart,
  TrendingUp,
  X,
} from 'lucide-react';
import type { Socket } from 'socket.io-client';

import { api, connectRealtime, money, setToken } from './api';
import type {
  Dashboard,
  Invoice,
  NotificationRow,
  Order,
  Outlet,
  Payment,
  Product,
  ProfitReport,
  UnitType,
  User,
} from './types';

type Tab = 'dashboard' | 'products' | 'outlets' | 'orders' | 'invoices' | 'payments' | 'reports' | 'notifications';

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'outlets', label: 'Outlets', icon: Store },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'invoices', label: 'Bills', icon: ReceiptText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'reports', label: 'Profit', icon: TrendingUp },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export function App() {
  const [tokenValue, setTokenValue] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? (JSON.parse(saved) as User) : null;
  });
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [profit, setProfit] = useState<ProfitReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setToken(tokenValue), [tokenValue]);

  const load = useCallback(async () => {
    if (!tokenValue) return;
    const [dash, productRows, orderRows, invoiceRows, paymentRows, notificationRows] =
      await Promise.all([
        api.get<Dashboard>('/v1/dashboard'),
        api.get<Product[]>('/v1/products'),
        api.get<Order[]>('/v1/orders'),
        api.get<Invoice[]>('/v1/invoices'),
        api.get<Payment[]>('/v1/payments'),
        api.get<NotificationRow[]>('/v1/notifications'),
      ]);
    setDashboard(dash.data);
    setProducts(productRows.data);
    setOrders(orderRows.data);
    setInvoices(invoiceRows.data);
    setPayments(paymentRows.data);
    setNotifications(notificationRows.data);
    if (user?.role === 'ADMIN') {
      const [outletRows, profitRows] = await Promise.all([
        api.get<Outlet[]>('/v1/outlets'),
        api.get<ProfitReport>('/v1/reports/profit'),
      ]);
      setOutlets(outletRows.data);
      setProfit(profitRows.data);
    }
  }, [tokenValue, user?.role]);

  useEffect(() => {
    if (!user || !tokenValue) return;
    let socket: Socket | null = connectRealtime(user, tokenValue);
    const refresh = () => void load();
    socket.on('order.created', refresh);
    socket.on('order.updated', refresh);
    socket.on('inventory.updated', refresh);
    socket.on('payment.created', refresh);
    socket.on('notification.created', refresh);
    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [load, tokenValue, user]);

  useEffect(() => {
    void load().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Unable to load data');
    });
  }, [load]);

  const lowStock = useMemo(
    () => products.filter((p) => p.current_stock_bottles <= p.minimum_stock_bottles),
    [products],
  );
  const visibleTabs = tabs.filter((item) => user?.role === 'ADMIN' || !['reports', 'outlets'].includes(item.id));
  const ActiveIcon = visibleTabs.find((item) => item.id === tab)?.icon ?? LayoutDashboard;

  if (!user || !tokenValue) {
    return <Login onLogin={(nextToken, nextUser) => {
      localStorage.setItem('token', nextToken);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setTokenValue(nextToken);
      setUser(nextUser);
    }} />;
  }

  return (
    <div className={menuOpen ? 'appShell menuOpen' : 'appShell'}>
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="Andhrawala" />
          <div>
            <strong>Andhrawala</strong>
            <span>Bar & Restaurant</span>
          </div>
          <button className="iconButton closeMenu" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="sideNav">
          {visibleTabs
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={tab === item.id ? 'active' : ''}
                  onClick={() => {
                    setTab(item.id);
                    setMenuOpen(false);
                  }}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>
        <button
          className="logout"
          onClick={() => {
            localStorage.clear();
            setTokenValue(null);
            setUser(null);
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <button className="menuScrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
      <main>
        <header className="mobileHeader">
          <button className="iconButton" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="mobileBrand">
            <img src="/logo.png" alt="Andhrawala" />
            <div>
              <strong>Andhrawala</strong>
              <span>{user.role === 'ADMIN' ? 'Admin' : 'Outlet'}</span>
            </div>
          </div>
          <button className="iconButton" onClick={() => setTab('notifications')} aria-label="Notifications">
            <Bell size={19} />
          </button>
        </header>
        <header className="topbar">
          <div>
            <p>{user.role === 'ADMIN' ? 'Admin Control Center' : 'Outlet Ordering Portal'}</p>
            <h1>{tabTitle(tab)}</h1>
          </div>
          <div className="chip">{user.name}</div>
        </header>
        <div className="quickTabs">
          {visibleTabs.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={tab === item.id ? 'active' : ''}
                onClick={() => setTab(item.id)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button className="moreTab" onClick={() => setMenuOpen(true)}>
            <ActiveIcon size={15} />
            <span>Menu</span>
          </button>
        </div>
        {error ? <div className="alert">{error}</div> : null}
        {tab === 'dashboard' && dashboard ? (
          <DashboardView dashboard={dashboard} lowStock={lowStock} user={user} />
        ) : null}
        {tab === 'products' ? <ProductsView user={user} products={products} onSaved={load} /> : null}
        {tab === 'outlets' && user.role === 'ADMIN' ? (
          <OutletsView outlets={outlets} orders={orders} invoices={invoices} payments={payments} onSaved={load} />
        ) : null}
        {tab === 'orders' ? (
          <OrdersView user={user} products={products} outlets={outlets} orders={orders} onSaved={load} />
        ) : null}
        {tab === 'invoices' ? <InvoicesView invoices={invoices} /> : null}
        {tab === 'payments' ? (
          <PaymentsView user={user} outlets={outlets} invoices={invoices} payments={payments} onSaved={load} />
        ) : null}
        {tab === 'reports' && profit ? <ReportsView profit={profit} /> : null}
        {tab === 'notifications' ? <NotificationsView rows={notifications} /> : null}
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [phone, setPhone] = useState('9000000000');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="loginPage">
      <section className="loginCard">
        <img src="/logo.png" alt="Andhrawala logo" />
        <h1>Andhrawala</h1>
        <p>Liquor outlet ordering, billing, stock, payments, and profit reporting.</p>
        <div className="landingActions">
          <a className="downloadButton" href="/download/andhrawala.apk" download>
            Download Android App
          </a>
          <span>Install APK from this server, then login below.</span>
        </div>
        {error ? <div className="alert">{error}</div> : null}
        <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button
          className="goldButton"
          onClick={async () => {
            try {
              const { data } = await api.post<{ token: string; user: User }>('/v1/auth/login', {
                phone,
                password,
              });
              onLogin(data.token, data.user);
            } catch {
              setError('Invalid login. Try seeded admin/outlet credentials from README.');
            }
          }}
        >
          Login
        </button>
      </section>
    </div>
  );
}

function DashboardView({
  dashboard,
  lowStock,
  user,
}: {
  dashboard: Dashboard;
  lowStock: Product[];
  user: User;
}) {
  const cards = [
    ['Today Orders', dashboard.total_orders],
    ['Pending Orders', dashboard.pending_orders],
    ['Delivered Orders', dashboard.delivered_orders],
    [user.role === 'ADMIN' ? 'Today Sales' : 'Total Bills', money(dashboard.today_sales)],
    [user.role === 'ADMIN' ? 'Today Profit' : 'Total Paid', money(dashboard.today_profit)],
    ['Pending Amount', money(dashboard.pending_amount)],
    ['Payments Received', money(dashboard.today_payments)],
    ['Low Stock Items', dashboard.low_stock_items],
  ];
  return (
    <>
      <section className="statsGrid">
        {cards.map(([label, value]) => (
          <article className="statCard" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="panel">
        <h2>Low stock alerts</h2>
        <div className="table">
          {lowStock.map((product) => (
            <div className="tr" key={product.id}>
              <span>{product.product_name}</span>
              <span>{product.current_stock_bottles} bottles</span>
              <span className="warning">Min {product.minimum_stock_bottles}</span>
            </div>
          ))}
          {lowStock.length === 0 ? <p className="muted">No low stock items.</p> : null}
        </div>
      </section>
    </>
  );
}

function ProductsView({
  user,
  products,
  onSaved,
}: {
  user: User;
  products: Product[];
  onSaved: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockType, setStockType] = useState<'in' | 'out'>('in');
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Product Catalogue</h2>
          {user.role === 'ADMIN' ? <p className="muted">Edit product details, pricing, images, stock IN, and stock OUT.</p> : null}
        </div>
        {user.role === 'ADMIN' ? (
          <button className="goldButton small" onClick={() => setShowForm(!showForm)}>
            <PackagePlus size={16} /> Add Product
          </button>
        ) : null}
      </div>
      {showForm ? <ProductForm onSaved={async () => { setShowForm(false); await onSaved(); }} /> : null}
      {editing ? <ProductForm product={editing} onSaved={async () => { setEditing(null); await onSaved(); }} /> : null}
      {stockProduct ? <StockForm product={stockProduct} type={stockType} onSaved={async () => { setStockProduct(null); await onSaved(); }} /> : null}
      <div className="productGrid">
        {products.map((product) => (
          <article className="productCard" key={product.id}>
            {product.bottle_image_url ? <img src={product.bottle_image_url} alt={product.product_name} /> : <div className="imagePlaceholder">Bottle</div>}
            <div>
              <h3>{product.product_name}</h3>
              <p>{product.brand} · {product.category} · {product.size_ml}ml</p>
              <div className="priceRow">
                <span>Bottle {money(product.selling_price_per_bottle)}</span>
                <span>Carton {money(product.carton_selling_price)}</span>
              </div>
              <div className="priceRow">
                <span>Full {money(product.full_price)}</span>
                <span>Half {money(product.half_price)}</span>
                <span>Quarter {money(product.quarter_price)}</span>
              </div>
              <p className={product.current_stock_bottles <= product.minimum_stock_bottles ? 'danger' : 'muted'}>
                Stock: {product.current_stock_bottles} full bottles / {(product.current_stock_bottles / product.bottles_per_carton).toFixed(1)} cartons / {(product.current_stock_ml / 1000).toFixed(2)} liters
              </p>
              {user.role === 'ADMIN' ? (
                <div className="actions">
                  <button onClick={() => setEditing(product)}><Edit3 size={13} /> Edit</button>
                  <button onClick={() => { setStockType('in'); setStockProduct(product); }}>Stock IN</button>
                  <button onClick={() => { setStockType('out'); setStockProduct(product); }}>Stock OUT</button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductForm({ product, onSaved }: { product?: Product; onSaved: () => Promise<void> }) {
  const productFields = ['product_name', 'brand', 'category', 'size_ml', 'bottles_per_carton', 'minimum_stock_bottles', 'barcode'];
  const unitFields = [
    ['Carton', 'carton_stock_count', 'carton_purchase_price', 'carton_selling_price'],
    ['Full bottle', 'full_bottles_count', 'full_purchase_price', 'full_price'],
    ['Half bottle', 'half_bottles_count', 'half_purchase_price', 'half_price'],
    ['Quarter bottle', 'quarter_bottles_count', 'quarter_purchase_price', 'quarter_price'],
    ['1 Liter bottle', 'liter_bottles_count', 'liter_purchase_price', 'liter_selling_price'],
  ];
  return (
    <form className="formGrid" onSubmit={async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      if (product) await api.patch(`/v1/products/${product.id}`, form);
      else await api.post('/v1/products', form);
      await onSaved();
    }}>
      {productFields.map((field) => (
        <label key={field}>
          {human(field)}
          <input
            name={field}
            required={!['barcode'].includes(field)}
            defaultValue={product ? String(product[field as keyof Product] ?? '') : numericProductFields.has(field) ? '0' : ''}
          />
        </label>
      ))}
      <label>Default Bottle Count<input name="current_stock_bottles" type="number" min="0" step="0.01" defaultValue={product?.current_stock_bottles ?? 0} /></label>
      <label>Bottle Purchase Price<input name="purchase_price_per_bottle" type="number" min="0" step="0.01" defaultValue={product?.purchase_price_per_bottle ?? 0} /></label>
      <label>Bottle Selling Price<input name="selling_price_per_bottle" type="number" min="0" step="0.01" defaultValue={product?.selling_price_per_bottle ?? 0} /></label>
      {unitFields.map(([label, countField, purchaseField, sellingField]) => (
        <fieldset className="unitFieldset" key={label}>
          <legend>{label}</legend>
          <label>Count / Quantity<input name={countField} type="number" min="0" step="0.01" defaultValue={product ? String(product[countField as keyof Product] ?? 0) : '0'} /></label>
          <label>Purchase Price<input name={purchaseField} type="number" min="0" step="0.01" defaultValue={product ? String(product[purchaseField as keyof Product] ?? 0) : '0'} /></label>
          <label>Selling Price<input name={sellingField} type="number" min="0" step="0.01" defaultValue={product ? String(product[sellingField as keyof Product] ?? 0) : '0'} /></label>
        </fieldset>
      ))}
      <label>Status
        <select name="status" defaultValue={product?.status ?? 'ACTIVE'}>
          <option>ACTIVE</option>
          <option>INACTIVE</option>
        </select>
      </label>
      <label>Bottle Image<input name="bottle_image" type="file" accept="image/*" /></label>
      <label>Carton Image<input name="carton_image" type="file" accept="image/*" /></label>
      <button className="goldButton">{product ? 'Update product' : 'Save product'}</button>
    </form>
  );
}

const numericProductFields = new Set([
  'size_ml', 'bottles_per_carton', 'purchase_price_per_bottle', 'selling_price_per_bottle',
  'carton_purchase_price', 'carton_selling_price', 'carton_stock_count', 'full_purchase_price',
  'full_price', 'full_bottles_count', 'half_purchase_price', 'half_price', 'half_bottles_count',
  'quarter_purchase_price', 'quarter_price', 'quarter_bottles_count', 'liter_purchase_price',
  'liter_selling_price', 'liter_bottles_count', 'current_stock_bottles', 'minimum_stock_bottles',
]);

function StockForm({ product, type, onSaved }: { product: Product; type: 'in' | 'out'; onSaved: () => Promise<void> }) {
  return (
    <form className="inlineForm stockForm" onSubmit={async (e) => {
      e.preventDefault();
      const form = Object.fromEntries(new FormData(e.currentTarget));
      await api.post(`/v1/products/${product.id}/stock-${type}`, form);
      await onSaved();
    }}>
      <strong>{type === 'in' ? 'Stock IN' : 'Stock OUT'}: {product.product_name}</strong>
      <input name="cartons" type="number" min="0" step="0.01" placeholder="Cartons" defaultValue="0" />
      <input name="full_bottles" type="number" min="0" step="0.01" placeholder="Full bottles" defaultValue="0" />
      <input name="half_bottles" type="number" min="0" step="0.01" placeholder="Half bottles" defaultValue="0" />
      <input name="quarter_bottles" type="number" min="0" step="0.01" placeholder="Quarter bottles" defaultValue="0" />
      <input name="liter_bottles" type="number" min="0" step="0.01" placeholder="1 Liter bottles" defaultValue="0" />
      <input name="note" placeholder="Note / reason" />
      <button className="goldButton small">{type === 'in' ? 'Add stock' : 'Remove stock'}</button>
    </form>
  );
}

function OutletsView({
  outlets,
  orders,
  invoices,
  payments,
  onSaved,
}: {
  outlets: Outlet[];
  orders: Order[];
  invoices: Invoice[];
  payments: Payment[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Outlet | null>(null);
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Outlet Management</h2>
          <p className="muted">Create outlets, view order totals, invoices, pending balances, and payments.</p>
        </div>
      </div>
      <OutletForm outlet={editing ?? undefined} onSaved={async () => { setEditing(null); await onSaved(); }} />
      <div className="table">
        {outlets.map((outlet) => {
          const outletOrders = orders.filter((order) => order.outlet_id === outlet.id);
          const outletInvoices = invoices.filter((invoice) => invoice.outlet_id === outlet.id);
          const outletPayments = payments.filter((payment) => payment.outlet_id === outlet.id);
          const pending = outletInvoices.reduce((sum, invoice) => sum + Number(invoice.remaining_balance), 0);
          const paid = outletPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
          return (
            <div className="tr outletRow" key={outlet.id}>
              <span><strong>{outlet.name}</strong><small>{outlet.phone ?? 'No phone'} · {outlet.address ?? 'No address'}</small></span>
              <span>Orders <strong>{outletOrders.length}</strong></span>
              <span>Invoices <strong>{outletInvoices.length}</strong><small>Pending {money(pending)}</small></span>
              <span>Payments <strong>{money(paid)}</strong><small>Limit {money(outlet.credit_limit)}</small></span>
              <span className="actions"><button onClick={() => setEditing(outlet)}>Edit outlet</button></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OutletForm({ outlet, onSaved }: { outlet?: Outlet; onSaved: () => Promise<void> }) {
  return (
    <form className="inlineForm" onSubmit={async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget));
      if (outlet) {
        await api.patch(`/v1/outlets/${outlet.id}`, body);
        const password = String(body.password ?? '');
        if (password) await api.post(`/v1/outlets/${outlet.id}/password`, { password });
      } else await api.post('/v1/outlets', body);
      e.currentTarget.reset();
      await onSaved();
    }}>
      <input name="name" placeholder="Outlet name" defaultValue={outlet?.name ?? ''} required />
      <input name="phone" placeholder="Login phone" defaultValue={outlet?.phone ?? ''} required />
      <input name="address" placeholder="Address" defaultValue={outlet?.address ?? ''} />
      <input name="credit_limit" type="number" min="0" placeholder="Credit limit" defaultValue={outlet?.credit_limit ?? 0} />
      <input name="password" placeholder={outlet ? 'New password / reset password' : 'Login password (default 123456)'} />
      <button className="goldButton small">{outlet ? 'Update outlet / password' : 'Create outlet login'}</button>
    </form>
  );
}

function OrdersView({
  user,
  products,
  outlets,
  orders,
  onSaved,
}: {
  user: User;
  products: Product[];
  outlets: Outlet[];
  orders: Order[];
  onSaved: () => Promise<void>;
}) {
  return (
    <section className="panel">
      <div className="sectionHeader"><h2>{user.role === 'ADMIN' ? 'Pending Orders' : 'Place Order'}</h2></div>
      <OrderForm user={user} products={products} outlets={outlets} onSaved={onSaved} />
      <div className="table">
        {orders.map((order) => (
          <div className="tr" key={order.id}>
            <span><strong>{order.order_number}</strong><small>{order.outlet_name}</small></span>
            <span>{order.status}</span>
            <span>{money(order.sales_total)}</span>
            {user.role === 'ADMIN' ? (
              <span className="actions">
                <button onClick={() => alertOrderItems(order.id)}>View</button>
                <button onClick={() => updateStatus(order.id, 'APPROVED', onSaved)}>Approve</button>
                <button onClick={() => updateStatus(order.id, 'DELIVERED', onSaved)}>Delivered</button>
                <button onClick={() => updateStatus(order.id, 'CANCELLED', onSaved)}>Cancel</button>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderForm({ user, products, outlets, onSaved }: { user: User; products: Product[]; outlets: Outlet[]; onSaved: () => Promise<void> }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [unit, setUnit] = useState<UnitType>('BOTTLE');
  const [quantity, setQuantity] = useState(1);
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? '');
  return (
    <form className="inlineForm" onSubmit={async (e) => {
      e.preventDefault();
      await api.post('/v1/orders', { outlet_id: outletId || undefined, items: [{ product_id: productId, unit_type: unit, quantity }] });
      await onSaved();
    }}>
      {user.role === 'ADMIN' ? <select value={outletId} onChange={(e) => setOutletId(e.target.value)}>{outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select> : null}
      <select value={productId} onChange={(e) => setProductId(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}</select>
      <select value={unit} onChange={(e) => setUnit(e.target.value as UnitType)}>{['BOTTLE', 'CARTON', 'FULL', 'HALF', 'QUARTER', 'LITER'].map((u) => <option key={u}>{u}</option>)}</select>
      <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
      <button className="goldButton small">Place Order</button>
    </form>
  );
}

async function updateStatus(id: string, status: string, onSaved: () => Promise<void>) {
  await api.post(`/v1/orders/${id}/status`, { status });
  await onSaved();
}

async function alertOrderItems(id: string) {
  const { data } = await api.get<{ product_name: string; unit_type: string; quantity: number; line_sales_total: number }[]>(`/v1/orders/${id}/items`);
  window.alert(data.map((item) => `${item.product_name} · ${item.unit_type} x ${item.quantity} = ${money(item.line_sales_total)}`).join('\n') || 'No items');
}

function InvoicesView({ invoices }: { invoices: Invoice[] }) {
  return (
    <section className="panel">
      <h2>Billing & Invoices</h2>
      <Rows rows={invoices.map((i) => [
        i.invoice_number,
        `${i.outlet_name} · ${i.order_number}`,
        i.status,
        `Bill ${money(i.amount)}`,
        `Paid ${money(i.paid_amount)} / Due ${money(i.remaining_balance)}`,
      ])} />
    </section>
  );
}

function PaymentsView({ user, outlets, invoices, payments, onSaved }: { user: User; outlets: Outlet[]; invoices: Invoice[]; payments: Payment[]; onSaved: () => Promise<void> }) {
  return (
    <section className="panel">
      <h2>Payment Update</h2>
      {user.role === 'ADMIN' ? <PaymentForm outlets={outlets} invoices={invoices} onSaved={onSaved} /> : null}
      <Rows rows={payments.map((p) => [p.payment_number, p.outlet_name, p.payment_mode, money(p.amount), p.reference_number ?? '-'])} />
    </section>
  );
}

function PaymentForm({ outlets, invoices, onSaved }: { outlets: Outlet[]; invoices: Invoice[]; onSaved: () => Promise<void> }) {
  return (
    <form className="inlineForm" onSubmit={async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      await api.post('/v1/payments', Object.fromEntries(form));
      await onSaved();
    }}>
      <select name="outlet_id">{outlets.map((o) => <option value={o.id} key={o.id}>{o.name}</option>)}</select>
      <select name="invoice_id"><option value="">No invoice</option>{invoices.filter((i) => i.status !== 'PAID').map((i) => <option value={i.id} key={i.id}>{i.invoice_number} · {money(i.remaining_balance)}</option>)}</select>
      <input name="amount" type="number" placeholder="Amount" />
      <select name="payment_mode"><option>CASH</option><option>BANK</option><option>CARD</option></select>
      <input name="reference_number" placeholder="Reference number" />
      <input name="remarks" placeholder="Remarks" />
      <button className="goldButton small">Record payment</button>
    </form>
  );
}

function ReportsView({ profit }: { profit: ProfitReport }) {
  return (
    <section className="panel">
      <h2>Profit Report</h2>
      <section className="statsGrid">
        <article className="statCard"><p>Overall Sales</p><strong>{money(profit.overall.sales)}</strong></article>
        <article className="statCard"><p>Overall Purchase</p><strong>{money(profit.overall.purchase)}</strong></article>
        <article className="statCard"><p>Overall Profit</p><strong>{money(profit.overall.profit)}</strong></article>
      </section>
      <h3>Product-wise Profit</h3>
      <Rows rows={profit.productWise.map((r) => [r.product_name, money(r.sales), money(r.purchase), money(r.profit)])} />
      <h3>Outlet-wise Profit</h3>
      <Rows rows={profit.outletWise.map((r) => [r.outlet_name, money(r.sales), money(r.purchase), money(r.profit)])} />
    </section>
  );
}

function NotificationsView({ rows }: { rows: NotificationRow[] }) {
  return <section className="panel"><h2>Notification Center</h2><Rows rows={rows.map((n) => [n.title, n.message, n.type, new Date(n.created_at).toLocaleString()])} /></section>;
}

function Rows({ rows }: { rows: (string | number)[][] }) {
  return <div className="table">{rows.map((row, index) => <div className="tr" key={index}>{row.map((cell, i) => <span key={i}>{cell}</span>)}</div>)}</div>;
}

function tabTitle(tab: Tab): string {
  return {
    dashboard: 'Dashboard',
    products: 'Product List',
    orders: 'Orders',
    invoices: 'Invoice Details',
    payments: 'Payment Update',
    reports: 'Profit Report',
    notifications: 'Notification Center',
    outlets: 'Outlet Management',
  }[tab];
}

function human(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}
