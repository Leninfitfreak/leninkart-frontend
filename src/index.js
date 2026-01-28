import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';

function App(){ 
  const [products,setProducts]=useState([]);
  const [orders,setOrders]=useState([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{ fetchProducts(); fetchOrders(); const iv=setInterval(fetchOrders,3000); return ()=>clearInterval(iv); },[]);

  function fetchProducts(){ axios.get('/api/products').then(r=>setProducts(r.data)).catch(console.error); }
  function fetchOrders(){ axios.get('/api/orders').then(r=>setOrders(r.data)).catch(console.error); }
  function buy(id){ setLoading(true); axios.post('/api/products/'+id+'/order').then(()=>{ setTimeout(fetchOrders,800); }).catch(console.error).finally(()=>setLoading(false)); }
  function add(e){ e.preventDefault(); const name=e.target.name.value; const price=parseFloat(e.target.price.value||0); const description=e.target.description.value; axios.post('/api/products',{name,price,description}).then(()=>{ fetchProducts(); e.target.reset(); }); }

  return (<div>
    <div className='header'><div style={{maxWidth:1100,margin:'0 auto'}}><h1>LeninKart — Event‑Driven Microservices Demo</h1><div style={{opacity:0.9,marginTop:6}}>Built by Lenin Raj • Kafka • PostgreSQL • Spring Boot • Kubernetes</div></div></div>
    <div className='container'>
      <div className='left'>
        <h2>Products</h2>
        {products.length===0 && <div className='card'>No products yet — add one below.</div>}
        {products.map(p=> (<div key={p.id} className='card'>
          <div className='product-title'>{p.name} — ₹{p.price}</div>
          <div style={{marginTop:8,color:'#374151'}}>{p.description}</div>
          <div style={{marginTop:12}}><button className='button' onClick={()=>buy(p.id)} disabled={loading}>{loading?'Processing...':'Buy'}</button></div>
        </div>))}
        <div className='card'>
          <h3>Add product</h3>
          <form className='form' onSubmit={add}>
            <input name='name' placeholder='Product name' required />
            <input name='price' placeholder='Price' style={{marginTop:8}} required />
            <input name='description' placeholder='Short description' style={{marginTop:8}} />
            <div style={{marginTop:10}}><button className='small-btn' type='submit'>Add</button></div>
          </form>
        </div>
      </div>
      <div className='right'>
        <h2>Orders</h2>
        {orders.length===0 && <div className='card'>No orders yet.</div>}
        {orders.map(o=>(<div key={o.id} className='card'><div style={{fontWeight:700}}>{o.productName} — ₹{o.price}</div><div style={{marginTop:6,color:'#6b7280'}}>Status: {o.status}</div></div>))}
      </div>
    </div>
    <div className='footer'>LeninKart demo — built by Lenin Raj • Running on Kubernetes</div>
  </div>); 
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
