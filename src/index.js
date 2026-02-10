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
    const username = e.target.username.value.trim();
    const password = e.target.password.value.trim();

    if (!username || !password) {
      setAuthError('Please enter both username/email and password.');
      return;
    }
    if (authMode === 'signup' && password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';
      const res = await api.post(endpoint, { username, password });
      const data = res.data || {};
      if (!data.token) {
        setAuthError('Invalid login response from server.');
        return;
      }

      const userInfo = { userId: data.userId || username, role: data.role || 'USER' };
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
        setAuthError('Invalid username or password.');
      } else {
        setAuthError('Unable to authenticate. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
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
          <h1>LeninKart - Smart Shopping</h1>
          <p>
            Secure access to your personal storefront. Manage products, track
            orders, and view user-based insights in one place.
          </p>
          <div className="brand-metrics">
            <div>
              <span>Products</span>
              <strong>Curated</strong>
            </div>
            <div>
              <span>Orders</span>
              <strong>Personalized</strong>
            </div>
            <div>
              <span>Insights</span>
              <strong>User-based</strong>
            </div>
          </div>
        </div>
        <div className="login-card">
          <div className="login-header">
            <h2>{authMode === 'signup' ? 'Create account' : 'Sign in'}</h2>
            <p>
              {authMode === 'signup'
                ? 'Create a new account to continue.'
                : 'Use your LeninKart credentials to continue.'}
            </p>
          </div>
          <form className="login-form" onSubmit={handleAuth}>
            <label>
              Username or Email
              <input name="username" placeholder="lenin@leninkart.io" />
            </label>
            <label>
              Password
              <input name="password" type="password" placeholder="••••••••" />
            </label>
            {authError && <div className="error">{authError}</div>}
            <button className="btn primary" type="submit" disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'signup' ? 'Create account' : 'Login'}
            </button>
          </form>
          <div className="auth-toggle">
            {authMode === 'signup' ? 'Already have an account?' : 'New to LeninKart?'}
            <button
              type="button"
              className="link"
              onClick={() => {
                setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                setAuthError('');
              }}
            >
              {authMode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </div>
          <div className="login-footer">
            By continuing, you agree to LeninKart security guidelines.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <div className="brand">LeninKart - Smart Shopping</div>
          <div className="subtitle">User-specific catalog and order tracking</div>
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
          <span>Total Users</span>
          <strong>{stats.users.length}</strong>
          <small>Across orders + products</small>
        </div>
        <div className="stat-card">
          <span>Total Orders</span>
          <strong>{stats.totalOrders}</strong>
          <small>Only your visibility</small>
        </div>
        <div className="stat-card">
          <span>Total Products</span>
          <strong>{stats.totalProducts}</strong>
          <small>Available to you</small>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Products</h2>
            <span className="pill">{stats.totalProducts} items</span>
          </div>
          {products.length === 0 && <div className="empty-card">No products yet - add one below.</div>}
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
          <div className="card form-card">
            <h3>Add product</h3>
            <form className="form" onSubmit={addProduct}>
              <input name="name" placeholder="Product name" required />
              <input name="price" placeholder="Price" type="number" min="0" step="0.01" required />
              <input name="description" placeholder="Short description" />
              <button className="btn primary" type="submit">Add product</button>
            </form>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Orders</h2>
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
            <h3>User Base Insights</h3>
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
