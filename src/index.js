import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';

const TOKEN_KEY = 'lk_token';
const USER_KEY = 'lk_user';

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(number);
}

function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return null;
    try {
      return { token, ...JSON.parse(rawUser) };
    } catch {
      return null;
    }
  });

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [dataError, setDataError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    if (!session) return undefined;
    fetchProducts();
    fetchOrders();
    const iv = setInterval(fetchOrders, 5000);
    return () => clearInterval(iv);
  }, [session]);

  function fetchProducts() {
    api.get('/api/products')
      .then((r) => setProducts(r.data))
      .catch((err) => {
        console.error(err);
        setDataError('Products service is unavailable or you are not authorized.');
      });
  }

  function fetchOrders() {
    api.get('/api/orders')
      .then((r) => setOrders(r.data))
      .catch((err) => {
        console.error(err);
        setDataError('Orders service is unavailable or you are not authorized.');
      });
  }

  async function handleAuth(e) {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();

    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    if (authMode === 'signup') {
      const fullName = e.target.fullName.value.trim();
      const confirmPassword = e.target.confirmPassword.value.trim();
      if (!fullName) {
        setAuthError('Please enter your full name.');
        return;
      }
      if (!email.includes('@')) {
        setAuthError('Please use a valid email for account creation.');
        return;
      }
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Password and confirm password do not match.');
        return;
      }
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthNotice('');

    try {
      const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';
      const payload = authMode === 'signup'
        ? { fullName: e.target.fullName.value.trim(), email, password }
        : { email, password };
      const res = await api.post(endpoint, payload);
      const data = res.data || {};

      if (authMode === 'signup') {
        if (!data.userId) {
          setAuthError('Invalid account creation response from server.');
          return;
        }
        setAuthNotice('Account created successfully. Please sign in with your credentials.');
        setAuthMode('login');
        e.target.reset();
        return;
      }

      if (!data.token) {
        setAuthError('Invalid login response from server.');
        return;
      }

      const userInfo = { userId: data.userId || email, role: data.role || 'USER' };
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
      setSession({ token: data.token, ...userInfo });
      setDataError('');
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 409) {
        setAuthError('User already exists. Please sign in.');
      } else if (status === 401) {
        setAuthError('Invalid email or password.');
      } else {
        setAuthError('Unable to authenticate. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  }

  function switchAuthMode(nextMode) {
    setAuthMode(nextMode);
    setAuthError('');
    setAuthNotice('');
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setSession(null);
    setProducts([]);
    setOrders([]);
  }

  function buy(id) {
    if (!session) return;
    setLoading(true);
    api.post(`/api/products/${id}/order`)
      .then(() => setTimeout(fetchOrders, 800))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function addProduct(e) {
    e.preventDefault();
    if (!session) return;
    const name = e.target.name.value.trim();
    const price = parseFloat(e.target.price.value || 0);
    const description = e.target.description.value.trim();
    api.post('/api/products', { name, price, description })
      .then(() => {
        fetchProducts();
        e.target.reset();
      })
      .catch(console.error);
  }

  const stats = useMemo(() => {
    const userSet = new Set();
    const orderCounts = {};
    const orderTotals = {};

    orders.forEach((o) => {
      const u = o.userName || 'anonymous';
      userSet.add(u);
      orderCounts[u] = (orderCounts[u] || 0) + 1;
      orderTotals[u] = (orderTotals[u] || 0) + Number(o.price || 0);
    });

    products.forEach((p) => {
      const u = p.createdBy || 'anonymous';
      userSet.add(u);
    });

    const topUsers = Object.keys(orderCounts)
      .sort((a, b) => orderCounts[b] - orderCounts[a])
      .slice(0, 5)
      .map((name) => ({
        name,
        orders: orderCounts[name],
        spend: orderTotals[name] || 0,
      }));

    return {
      users: Array.from(userSet),
      topUsers,
      totalOrders: orders.length,
      totalProducts: products.length,
    };
  }, [orders, products]);

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-brand">
          <div className="logo-badge">LK</div>
          <h1>LeninKart E-Commerce Portal</h1>
          <p>
            Centralized access for catalog operations, order visibility, and secure account-based usage across the platform.
          </p>
          <div className="brand-metrics">
            <div>
              <span>Catalog Control</span>
              <strong>Centralized</strong>
            </div>
            <div>
              <span>Order Tracking</span>
              <strong>Role-Aware</strong>
            </div>
            <div>
              <span>Access Model</span>
              <strong>Secure Authentication</strong>
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <h2>{authMode === 'signup' ? 'Create your account' : 'Sign in to workspace'}</h2>
            <p>
              {authMode === 'signup'
                ? 'Register with your professional email. After account creation, sign in manually.'
                : 'Authenticate with your workspace credentials to continue.'}
            </p>
          </div>

          <form className="login-form" onSubmit={handleAuth}>
            {authMode === 'signup' && (
              <label>
                Full Name
                <input name="fullName" placeholder="Lenin Raj" />
              </label>
            )}
            <label>
              Email
              <input name="email" placeholder="lenin@leninkart.io" />
            </label>
            <label>
              Password
              <input name="password" type="password" placeholder="********" />
            </label>
            {authMode === 'signup' && (
              <label>
                Confirm Password
                <input name="confirmPassword" type="password" placeholder="********" />
              </label>
            )}

            {authError && <div className="error">{authError}</div>}
            {authNotice && <div className="notice">{authNotice}</div>}

            <button className="btn primary" type="submit" disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'signup' ? 'Create account' : 'Login'}
            </button>
          </form>

          <div className="auth-toggle">
            {authMode === 'signup' ? 'Already registered?' : 'Need an account?'}
            <button
              type="button"
              className="link"
              onClick={() => switchAuthMode(authMode === 'signup' ? 'login' : 'signup')}
            >
              {authMode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </div>

          <div className="login-footer">
            By proceeding, you agree to LeninKart access control and usage policy.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <div className="brand">LeninKart E-Commerce Operations</div>
          <div className="subtitle">Authenticated product catalog and order visibility</div>
        </div>
        <div className="user-pill">
          <div>
            <strong>{session.userId}</strong>
            <span>{session.role}</span>
          </div>
          <button className="btn ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {dataError && <div className="alert">{dataError}</div>}

      <section className="stats-grid">
        <div className="stat-card">
          <span>Visible Users</span>
          <strong>{stats.users.length}</strong>
          <small>From your accessible data scope</small>
        </div>
        <div className="stat-card">
          <span>Orders in Scope</span>
          <strong>{stats.totalOrders}</strong>
          <small>Filtered by authenticated access</small>
        </div>
        <div className="stat-card">
          <span>Products in Scope</span>
          <strong>{stats.totalProducts}</strong>
          <small>Visible to current user role</small>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Product Catalog</h2>
            <span className="pill">{stats.totalProducts} items</span>
          </div>
          <div className="card form-card">
            <h3>Create Product Entry</h3>
            <form className="form" onSubmit={addProduct}>
              <input name="name" placeholder="Product name" required />
              <input name="price" placeholder="Price" type="number" min="0" step="0.01" required />
              <input name="description" placeholder="Short description" />
              <button className="btn primary" type="submit">Add product</button>
            </form>
          </div>
          {products.length === 0 && <div className="empty-card">No products yet. Add one below.</div>}
          <div className="list">
            {products.map((p) => (
              <div key={p.id} className="card">
                <div className="card-row">
                  <div>
                    <div className="card-title">{p.name}</div>
                    <div className="card-sub">{p.description}</div>
                    <div className="card-meta">Created by {p.createdBy || 'anonymous'}</div>
                  </div>
                  <div className="price">{formatCurrency(p.price)}</div>
                </div>
                <button className="btn" onClick={() => buy(p.id)} disabled={loading}>
                  {loading ? 'Processing...' : 'Buy'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Order Ledger</h2>
            <span className="pill">{stats.totalOrders} orders</span>
          </div>
          {orders.length === 0 && <div className="empty-card">No orders yet.</div>}
          <div className="list">
            {orders.map((o) => (
              <div key={o.id} className="card">
                <div className="card-row">
                  <div>
                    <div className="card-title">{o.productName}</div>
                    <div className="card-sub">Status: {o.status}</div>
                    <div className="card-meta">User: {o.userName || 'anonymous'}</div>
                  </div>
                  <div className="price">{formatCurrency(o.price)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>User Activity Overview</h3>
            <div className="chip-row">
              {stats.users.slice(0, 8).map((u) => (
                <span key={u} className="chip">{u}</span>
              ))}
              {stats.users.length === 0 && <span className="chip muted">No users yet</span>}
            </div>
            <div className="top-users">
              {stats.topUsers.map((u) => (
                <div key={u.name} className="top-user">
                  <div>
                    <strong>{u.name}</strong>
                    <span>{u.orders} orders</span>
                  </div>
                  <div className="price">{formatCurrency(u.spend)}</div>
                </div>
              ))}
              {stats.topUsers.length === 0 && <div className="empty-card">No order activity yet.</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
