// In the products map
{products.map(p => (
  <div key={p.id} className='card'>
    <div className='product-title'>{p.name} — ₹{p.price}</div>
    <div style={{ marginTop: 8, color: '#374151' }}>{p.description}</div>
    <div style={{ marginTop: 12 }}>
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

// In the orders map
{orders.map(o => (
  <div key={o.id} className='card'>
    <div style={{ fontWeight: 700 }}>{o.productName} — ₹{o.price}</div>
    <div style={{ marginTop: 6, color: '#6b7280' }}>Status: {o.status}</div>
  </div>
))}
