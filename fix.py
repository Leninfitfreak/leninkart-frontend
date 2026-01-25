#!/usr/bin/env python3
"""
Fix LeninKart Frontend Repository
Updates index.js to handle Kubernetes environment with proper error handling
Author: Lenin Raj
"""

from pathlib import Path
from datetime import datetime
import shutil

# The fixed index.js with error handling
FIXED_INDEX_JS = '''import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';

function App(){ 
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { 
    fetchProducts(); 
    fetchOrders(); 
    const iv = setInterval(fetchOrders, 3000); 
    return () => clearInterval(iv); 
  }, []);

  function fetchProducts() { 
    axios.get('/api/products')
      .then(r => {
        console.log('Products:', r.data);
        if (Array.isArray(r.data)) {
          setProducts(r.data);
          setError(null);
        } else {
          console.error('Products not an array:', r.data);
          setProducts([]);
        }
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setError('Failed to load products: ' + err.message);
        setProducts([]);
      });
  }

  function fetchOrders() { 
    axios.get('/api/orders')
      .then(r => {
        console.log('Orders:', r.data);
        if (Array.isArray(r.data)) {
          setOrders(r.data);
        } else {
          console.error('Orders not an array:', r.data);
          setOrders([]);
        }
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setOrders([]);
      });
  }

  function buy(id) { 
    setLoading(true); 
    axios.post('/api/products/' + id + '/order')
      .then(() => { 
        setTimeout(fetchOrders, 800); 
      })
      .catch(err => {
        console.error('Error creating order:', err);
        alert('Failed to create order: ' + err.message);
      })
      .finally(() => setLoading(false)); 
  }

  function add(e) { 
    e.preventDefault(); 
    const name = e.target.name.value; 
    const price = parseFloat(e.target.price.value || 0); 
    const description = e.target.description.value; 
    
    axios.post('/api/products', {name, price, description})
      .then(() => { 
        fetchProducts(); 
        e.target.reset(); 
        setError(null);
      })
      .catch(err => {
        console.error('Error adding product:', err);
        alert('Failed to add product: ' + err.message);
      });
  }

  return (
    <div>
      <div className='header'>
        <div style={{maxWidth:1100, margin:'0 auto'}}>
          <h1>LeninKart — Event‑Driven Microservices Demo</h1>
          <div style={{opacity:0.9, marginTop:6}}>
            Built by Lenin Raj • Kafka • PostgreSQL • Spring Boot • Kubernetes
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          maxWidth:1100, 
          margin:'20px auto', 
          padding:'16px', 
          background:'#fee2e2', 
          border:'1px solid #fca5a5',
          borderRadius:'8px',
          color:'#991b1b'
        }}>
          <strong>⚠️ Error:</strong> {error}
          <div style={{marginTop:8, fontSize:'14px'}}>
            Check console for details. Ensure backend services are running.
          </div>
        </div>
      )}

      <div className='container'>
        <div className='left'>
          <h2>Products</h2>
          {products.length === 0 && !error && (
            <div className='card'>No products yet — add one below.</div>
          )}
          {products.map(p => (
            <div key={p.id} className='card'>
              <div className='product-title'>{p.name} — ${p.price}</div>
              <div style={{marginTop:8, color:'#374151'}}>{p.description}</div>
              <div style={{marginTop:12}}>
                <button 
                  className='button' 
                  onClick={() => buy(p.id)} 
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Buy'}
                </button>
              </div>
            </div>
          ))}

          <div className='card'>
            <h3>Add product</h3>
            <form className='form' onSubmit={add}>
              <input name='name' placeholder='Product name' required />
              <input name='price' placeholder='Price' type='number' step='0.01' style={{marginTop:8}} required />
              <input name='description' placeholder='Short description' style={{marginTop:8}} />
              <div style={{marginTop:10}}>
                <button className='small-btn' type='submit'>Add</button>
              </div>
            </form>
          </div>
        </div>

        <div className='right'>
          <h2>Orders</h2>
          {orders.length === 0 && <div className='card'>No orders yet.</div>}
          {orders.map(o => (
            <div key={o.id} className='card'>
              <div style={{fontWeight:700}}>{o.productName} — ${o.price}</div>
              <div style={{marginTop:6, color:'#6b7280'}}>Status: {o.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div className='footer'>
        LeninKart demo — built by Lenin Raj • Running on Kubernetes
      </div>
    </div>
  ); 
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
'''

FIXED_PACKAGE_JSON = '''{
  "name": "leninkart-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "axios": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}
'''

class FrontendFixer:
    def __init__(self, repo_path="."):
        self.repo_path = Path(repo_path)
        self.backup_dir = self.repo_path / f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.fixes = []
        
    def log(self, msg, level="INFO"):
        colors = {"INFO": "\033[94m", "SUCCESS": "\033[92m", "ERROR": "\033[91m", "RESET": "\033[0m"}
        print(f"{colors.get(level, '')}{level}: {msg}{colors['RESET']}")
    
    def backup_file(self, file_path):
        if not self.backup_dir.exists():
            self.backup_dir.mkdir(parents=True)
        
        rel_path = file_path.relative_to(self.repo_path)
        backup_path = self.backup_dir / rel_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
    
    def fix_index_js(self):
        """Replace index.js with Kubernetes-compatible version"""
        index_file = self.repo_path / "src/index.js"
        
        if not index_file.exists():
            self.log("src/index.js not found!", "ERROR")
            return False
        
        self.backup_file(index_file)
        index_file.write_text(FIXED_INDEX_JS, encoding='utf-8')
        
        self.fixes.append("✓ Updated index.js with error handling")
        self.log("Fixed src/index.js", "SUCCESS")
        return True
    
    def fix_package_json(self):
        """Remove proxy from package.json"""
        pkg_file = self.repo_path / "package.json"
        
        if not pkg_file.exists():
            self.log("package.json not found!", "ERROR")
            return False
        
        self.backup_file(pkg_file)
        pkg_file.write_text(FIXED_PACKAGE_JSON, encoding='utf-8')
        
        self.fixes.append("✓ Updated package.json (removed proxy)")
        self.log("Fixed package.json", "SUCCESS")
        return True
    
    def run(self):
        self.log("=" * 60, "INFO")
        self.log("LeninKart Frontend Fixer", "INFO")
        self.log("=" * 60, "INFO")
        
        # Verify we're in the right repo
        if not (self.repo_path / "src").exists():
            self.log("ERROR: Not in leninkart-frontend repo!", "ERROR")
            self.log("Run this from the frontend repository root", "ERROR")
            return False
        
        self.log("Starting fixes...", "INFO")
        self.fix_index_js()
        self.fix_package_json()
        
        self.log("", "INFO")
        self.log("=" * 60, "SUCCESS")
        self.log(f"Applied {len(self.fixes)} fixes:", "SUCCESS")
        for fix in self.fixes:
            self.log(f"  {fix}", "SUCCESS")
        
        self.log("", "INFO")
        self.log(f"Backup: {self.backup_dir.name}", "INFO")
        self.log("", "INFO")
        self.log("NEXT STEPS:", "INFO")
        self.log("", "INFO")
        self.log("1. Build new Docker image:", "INFO")
        timestamp = datetime.now().strftime('%s')
        self.log(f"   docker build -t leninfitfreak/frontend:{timestamp} .", "INFO")
        self.log("", "INFO")
        self.log("2. Push to Docker Hub:", "INFO")
        self.log(f"   docker push leninfitfreak/frontend:{timestamp}", "INFO")
        self.log("", "INFO")
        self.log("3. Update infra repo values-dev.yaml:", "INFO")
        self.log(f"   Change image.tag to '{timestamp}'", "INFO")
        self.log("", "INFO")
        self.log("4. Commit frontend changes:", "INFO")
        self.log("   git add .", "INFO")
        self.log("   git commit -m 'fix: add K8s error handling'", "INFO")
        self.log("   git push origin dev", "INFO")
        self.log("=" * 60, "INFO")
        
        return True

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        repo_path = sys.argv[1]
    else:
        repo_path = "."
    
    fixer = FrontendFixer(repo_path)
    success = fixer.run()
    sys.exit(0 if success else 1)