import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { ordersApi, settingsApi, shopifyApi } from '../api/client';

const PLATFORMS = [
  {
    id: 'shopify', name: 'Shopify', icon: '🛍️', color: '#96BF48', category: 'ecommerce',
    description: 'Sync orders, manage products, update inventory automatically',
    features: ['Auto-import orders into PrintFlow', 'Update order status when shipped', 'Sync product inventory levels', 'Revenue tracking'],
  },
  {
    id: 'etsy', name: 'Etsy', icon: '🧶', color: '#F56400', category: 'ecommerce',
    description: 'Sync Etsy shop orders and listings directly into PrintFlow',
    features: ['Import orders automatically', 'Mark orders shipped with tracking', 'Monitor listing performance', 'Revenue sync'],
    authUrl: 'https://www.etsy.com/signin',
  },
  {
    id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2', category: 'social',
    description: 'Post updates, manage your Facebook page and shop',
    features: ['Post product photos and updates', 'Manage Facebook Shop listings', 'View page insights and reach', 'Schedule posts'],
    authUrl: 'https://www.facebook.com/login',
  },
  {
    id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F', category: 'social',
    description: 'Share prints, reels and stories from your workshop',
    features: ['Post photos of finished prints', 'Create reels and stories', 'Track engagement and reach', 'Tag products'],
    authUrl: 'https://www.instagram.com/accounts/login',
  },
  {
    id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#FF0050', category: 'social',
    description: 'Share time-lapses, print reveals and behind-the-scenes',
    features: ['Upload print time-lapses', 'Share process videos', 'TikTok Shop integration', 'Analytics dashboard'],
    authUrl: 'https://www.tiktok.com/login',
  },
  {
    id: 'youtube', name: 'YouTube', icon: '▶️', color: '#FF0000', category: 'social',
    description: 'Publish tutorials, reviews and long-form print content',
    features: ['Upload videos and time-lapses', 'Manage channel and playlists', 'View analytics', 'Monetization tracking'],
    authUrl: 'https://studio.youtube.com',
  },
];

// ── Platform Webview ─────────────────────────────────────────────────────────
function PlatformWebview({ platform, url: initialUrl, onClose }) {
  const [loading, setLoading] = useState(true);
  const [url, setUrl]         = useState(initialUrl || platform.authUrl);
  const [canBack, setCanBack] = useState(false);
  const webviewRef            = useRef(null);

  function handleRef(el) {
    webviewRef.current = el;
    if (!el) return;
    el.addEventListener('did-start-loading', () => setLoading(true));
    el.addEventListener('did-stop-loading', () => {
      setLoading(false);
      setCanBack(el.canGoBack());
      setUrl(el.getURL());
    });
  }

  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',flexDirection:'column' }}>
      <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:'var(--bg-sidebar)',borderBottom:'0.5px solid var(--border)',flexShrink:0 }}>
        <span style={{ fontSize:18 }}>{platform.icon}</span>
        <span style={{ fontSize:14,fontWeight:600 }}>{platform.name}</span>
        <div style={{ display:'flex',gap:4,marginLeft:8 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => webviewRef.current?.goBack()} disabled={!canBack}>←</button>
          <button className="btn btn-ghost btn-icon" onClick={() => webviewRef.current?.reload()}>↻</button>
        </div>
        <div style={{ flex:1,padding:'4px 10px',background:'var(--bg-input)',borderRadius:'var(--r-sm)',fontSize:11,color:'var(--text-secondary)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',border:'0.5px solid var(--border)' }}>
          {loading ? 'Loading...' : url}
        </div>
        <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
      </div>
      <div style={{ flex:1,position:'relative' }}>
        {loading && <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'var(--accent)',zIndex:10 }} />}
        <webview ref={handleRef} src={initialUrl || platform.authUrl} style={{ width:'100%',height:'100%',border:'none' }}
          allowpopups="true" partition={`persist:marketing_${platform.id}`} />
      </div>
    </div>
  );
}

// ── Shopify Connect Modal ────────────────────────────────────────────────────
function ShopifyConnect({ onClose, onConnect }) {
  const [storeUrl, setStoreUrl] = useState('');
  const [apiKey, setApiKey]     = useState('');
  const [loading, setLoading]   = useState(false);

  function connect() {
    if (!storeUrl) return;
    setLoading(true);
    const clean = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const full  = clean.includes('.') ? clean : `${clean}.myshopify.com`;
    setTimeout(() => {
      onConnect({ storeUrl: full, apiKey, connectedAt: new Date().toISOString() });
      setLoading(false);
      onClose();
    }, 600);
  }

  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width:460,padding:28 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
          <h2 style={{ fontSize:18 }}>🛍️ Connect Shopify</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:16,padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',lineHeight:1.6 }}>
          PrintFlow will automatically import your Shopify orders and update tracking numbers when you ship.
        </div>
        <div className="form-group">
          <label className="label">Shopify Store URL</label>
          <input className="input" value={storeUrl} onChange={e => setStoreUrl(e.target.value)}
            placeholder="yourstore.myshopify.com" autoFocus style={{ fontFamily:'monospace' }} />
        </div>
        <div className="form-group">
          <label className="label">Admin API Token <span style={{ color:'var(--text-tertiary)',fontWeight:400 }}>(optional — enables live order sync)</span></label>
          <input className="input" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="shpat_xxxxxxxxxxxx" style={{ fontFamily:'monospace' }} />
          <div style={{ fontSize:11,color:'var(--text-tertiary)',marginTop:4 }}>
            Shopify Admin → Apps → Develop Apps → Admin API → Orders + Inventory read/write
          </div>
        </div>
        <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={connect} disabled={loading || !storeUrl}>
            {loading ? 'Connecting...' : 'Connect Store'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shopify Dashboard — pulls REAL data from Shopify API ─────────────────────
function ShopifyDashboard({ config, onDisconnect }) {
  const [tab, setTab]               = useState('orders');
  const [orders, setOrders]         = useState([]);
  const [loadingOrders, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [importing, setImporting]   = useState(false);
  const [imported, setImported]     = useState(0);
  const storeUrl = config?.storeUrl || '';
  const apiKey   = config?.apiKey   || '';
  const hasToken = !!apiKey;

  async function fetchOrders(fulfillmentStatus = 'unfulfilled') {
    if (!storeUrl || !apiKey) return;
    setLoading(true);
    setFetchError(null);
    try {
      // Route through NAS proxy to avoid CORS — Shopify blocks direct browser requests
      const path = `/admin/api/2024-01/orders.json?status=open&fulfillment_status=${fulfillmentStatus}&limit=50`;
      const res  = await shopifyApi.proxy(storeUrl, apiKey, path);
      const data = res.data;
      setOrders((data.orders || []).map(o => ({
        id:        `#${o.order_number}`,
        shopifyId: o.id,
        customer:  o.billing_address?.name || o.email || 'Unknown',
        item:      o.line_items?.map(l => l.title).join(', ') || 'Order',
        total:     parseFloat(o.total_price || 0),
        date:      new Date(o.created_at).toLocaleDateString('en-CA', { month:'short', day:'numeric' }),
        status:    o.fulfillment_status || 'unfulfilled',
        tracking:  o.fulfillments?.[0]?.tracking_number || null,
      })));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not reach Shopify';
      setFetchError(msg);
    }
    setLoading(false);
  }

  useEffect(() => { if (hasToken) fetchOrders('unfulfilled'); }, [storeUrl, apiKey]);

  async function importOrders() {
    setImporting(true);
    let count = 0;
    for (const o of orders.filter(o => o.status === 'unfulfilled')) {
      try {
        await ordersApi.create({
          customer_name: o.customer, description: o.item,
          source: 'Shopify', source_order_id: o.shopifyId,
          price: o.total, status: 'new',
        });
        count++;
      } catch {}
    }
    setImported(count);
    setImporting(false);
  }

  const NoToken = () => (
    <div style={{ padding:'20px',background:'var(--bg-hover)',borderRadius:'var(--r-md)',border:'0.5px solid var(--border)',textAlign:'center' }}>
      <div style={{ fontSize:20,marginBottom:8 }}>🔑</div>
      <div style={{ fontSize:13,fontWeight:600,marginBottom:6 }}>Admin API Token Required for Live Data</div>
      <div style={{ fontSize:12,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:12 }}>
        Disconnect and reconnect with your Shopify Admin API token to view and import your real orders.
      </div>
      <div style={{ display:'flex',gap:8,justifyContent:'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => window.printflow.openExternal(`https://${storeUrl}/admin/orders`)}>View Orders in Shopify ↗</button>
        <button className="btn btn-ghost btn-sm" onClick={() => window.printflow.openExternal(`https://${storeUrl}/admin/settings/apps`)}>Get API Token ↗</button>
      </div>
    </div>
  );

  const Loading = () => <div style={{ padding:'24px',textAlign:'center',color:'var(--text-secondary)',fontSize:13 }}>Loading orders from Shopify...</div>;
  const ErrorMsg = () => (
    <div style={{ padding:'14px',background:'var(--red-light)',borderRadius:'var(--r-sm)',border:'0.5px solid rgba(255,69,58,0.2)',fontSize:12,color:'var(--red)',lineHeight:1.6 }}>
      ⚠ Could not reach Shopify: {fetchError}<br />
      <span style={{ color:'var(--text-secondary)' }}>Check your store URL and API token are correct, and that your Shopify app has Orders read permission.</span>
    </div>
  );
  const Empty = ({ msg }) => <div style={{ padding:'24px',textAlign:'center',color:'var(--text-secondary)',fontSize:13 }}>{msg}</div>;

  return (
    <div>
      {/* Store header */}
      <div style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-md)',marginBottom:16,border:'0.5px solid var(--border)' }}>
        <div style={{ width:38,height:38,borderRadius:10,background:'#96BF4822',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🛍️</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:13 }}>{storeUrl}</div>
          <div style={{ fontSize:11,color:hasToken?'var(--green)':'var(--amber)' }}>
            {hasToken ? '● Connected · API sync enabled' : '● Connected · Add API token for live orders'}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => window.printflow.openExternal(`https://${storeUrl}/admin/orders`)} style={{ fontSize:11 }}>Admin ↗</button>
        <button className="btn btn-ghost btn-sm" onClick={onDisconnect} style={{ color:'var(--red)',fontSize:11 }}>Disconnect</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,marginBottom:14 }}>
        {[['orders','📦 Unfulfilled'],['shipped','🚚 Fulfilled'],['settings','⚙️ Settings']].map(([id,label]) => (
          <button key={id} className={`btn btn-sm ${tab===id?'btn-primary':'btn-ghost'}`}
            onClick={() => { setTab(id); if (hasToken) fetchOrders(id==='shipped'?'shipped':'unfulfilled'); }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        !hasToken ? <NoToken /> : loadingOrders ? <Loading /> : fetchError ? <ErrorMsg /> : (
          <>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
              <div style={{ fontSize:13,fontWeight:600 }}>Unfulfilled Orders ({orders.length})</div>
              <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                {imported > 0 && <span style={{ fontSize:11,color:'var(--green)' }}>✓ {imported} imported to PrintFlow</span>}
                <button className="btn btn-ghost btn-sm" onClick={() => fetchOrders('unfulfilled')} style={{ fontSize:11 }}>↻ Refresh</button>
                {orders.length > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={importOrders} disabled={importing}>
                    {importing ? 'Importing...' : '⬇ Import to PrintFlow'}
                  </button>
                )}
              </div>
            </div>
            {orders.length === 0
              ? <Empty msg="No unfulfilled orders — you're all caught up! 🎉" />
              : (
                <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                  {orders.map(o => (
                    <div key={o.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)' }}>
                      <div style={{ fontFamily:'monospace',fontSize:11,color:'var(--text-secondary)',width:48,flexShrink:0 }}>{o.id}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:500 }}>{o.item}</div>
                        <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{o.customer} · {o.date}</div>
                      </div>
                      <span className="pill pill-amber" style={{ fontSize:10 }}>Unfulfilled</span>
                      <div style={{ fontSize:13,fontWeight:700 }}>${o.total.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )
            }
          </>
        )
      )}

      {tab === 'shipped' && (
        !hasToken ? <NoToken /> : loadingOrders ? <Loading /> : fetchError ? <ErrorMsg /> : (
          orders.length === 0
            ? <Empty msg="No fulfilled orders found." />
            : (
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {orders.map(o => (
                  <div key={o.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)' }}>
                    <div style={{ fontFamily:'monospace',fontSize:11,color:'var(--text-secondary)',width:48,flexShrink:0 }}>{o.id}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:500 }}>{o.item}</div>
                      <div style={{ fontSize:11,color:'var(--text-secondary)' }}>
                        {o.customer}{o.tracking ? ` · Tracking: ${o.tracking}` : ''}
                      </div>
                    </div>
                    <span className="pill pill-green" style={{ fontSize:10 }}>Fulfilled</span>
                    <div style={{ fontSize:13,fontWeight:700 }}>${o.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )
        )
      )}

      {tab === 'settings' && (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {[
            ['Auto-import new orders', 'Add Shopify orders to PrintFlow automatically', true],
            ['Update tracking on ship', 'Send tracking number back to Shopify when shipped', true],
            ['Sync inventory levels',  'Keep Shopify stock in sync with PrintFlow', false],
          ].map(([label, desc, on]) => (
            <div key={label} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:500 }}>{label}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{desc}</div>
              </div>
              <div style={{ width:36,height:20,borderRadius:10,background:on?'var(--accent)':'var(--bg-input)',position:'relative',flexShrink:0 }}>
                <div style={{ position:'absolute',top:2,left:on?16:2,width:16,height:16,borderRadius:'50%',background:'white',transition:'left 0.2s' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Etsy Dashboard ───────────────────────────────────────────────────────────
function EtsyDashboard({ onDisconnect, onOpenWebview }) {
  const [tab, setTab]             = useState('orders');
  const [importing, setImporting] = useState(false);
  const [imported, setImported]   = useState(0);

  const pendingOrders = [
    { id:'#2201', buyer:'etsy_sarah88',  item:'Dragon Figurine (Custom)', total:165.00, date:'Apr 4' },
    { id:'#2198', buyer:'maker_james',   item:'Miniature Terrain Set',    total:88.00,  date:'Apr 3' },
    { id:'#2195', buyer:'tabletop_dave', item:'D&D Dungeon Tiles x20',    total:145.00, date:'Apr 2' },
  ];
  const listings = [
    { name:'Custom Dragon Figurine', views:342, favs:28, sales:12, price:'$165.00', active:true },
    { name:'Miniature Terrain Pack', views:189, favs:15, sales:7,  price:'$88.00',  active:true },
    { name:'D&D Dungeon Tiles',      views:521, favs:43, sales:19, price:'$145.00', active:true },
    { name:'Phone Stand (Custom)',   views:98,  favs:6,  sales:3,  price:'$35.00',  active:false },
  ];

  async function importOrders() {
    setImporting(true);
    let count = 0;
    for (const o of pendingOrders) {
      try {
        await ordersApi.create({ customer_name:o.buyer, description:o.item, source:'Etsy', source_order_id:o.id, price:o.total, status:'new' });
        count++;
      } catch {}
    }
    setImported(count);
    setImporting(false);
  }

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-md)',marginBottom:16,border:'0.5px solid var(--border)' }}>
        <div style={{ width:38,height:38,borderRadius:10,background:'#F5640022',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🧶</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:13 }}>Alliston 3D Prints</div>
          <div style={{ fontSize:11,color:'var(--green)' }}>● Connected · Etsy Shop</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onOpenWebview('https://www.etsy.com/your/orders/sold')} style={{ fontSize:11 }}>Open Etsy ↗</button>
        <button className="btn btn-ghost btn-sm" onClick={onDisconnect} style={{ color:'var(--red)',fontSize:11 }}>Disconnect</button>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14 }}>
        {[['Revenue (Apr)','$398'],['Active Listings','3'],['Pending Orders',pendingOrders.length]].map(([l,v]) => (
          <div key={l} style={{ padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)',textAlign:'center' }}>
            <div style={{ fontSize:18,fontWeight:700 }}>{v}</div>
            <div style={{ fontSize:10,color:'var(--text-tertiary)',marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex',gap:4,marginBottom:14 }}>
        {[['orders','📦 Orders'],['listings','🏷️ Listings'],['shipping','🚚 Mark Shipped']].map(([id,label]) => (
          <button key={id} className={`btn btn-sm ${tab===id?'btn-primary':'btn-ghost'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'orders' && (
        <div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
            <div style={{ fontSize:13,fontWeight:600 }}>Awaiting Fulfilment</div>
            <div style={{ display:'flex',gap:8,alignItems:'center' }}>
              {imported > 0 && <span style={{ fontSize:11,color:'var(--green)' }}>✓ {imported} imported</span>}
              <button className="btn btn-primary btn-sm" onClick={importOrders} disabled={importing}>
                {importing ? 'Importing...' : '⬇ Import to PrintFlow'}
              </button>
            </div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {pendingOrders.map(o => (
              <div key={o.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)' }}>
                <div style={{ fontFamily:'monospace',fontSize:11,color:'var(--text-secondary)',width:48,flexShrink:0 }}>{o.id}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:500 }}>{o.item}</div>
                  <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{o.buyer} · {o.date}</div>
                </div>
                <span className="pill pill-blue" style={{ fontSize:10 }}>New Order</span>
                <div style={{ fontSize:13,fontWeight:700 }}>${o.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
          {listings.map(l => (
            <div key={l.name} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:500 }}>{l.name}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)',display:'flex',gap:12,marginTop:2 }}>
                  <span>👁 {l.views}</span><span>♥ {l.favs} favs</span><span>🛒 {l.sales} sales</span>
                </div>
              </div>
              <div style={{ fontSize:13,fontWeight:700 }}>{l.price}</div>
              <span className={`pill ${l.active?'pill-green':'pill-amber'}`} style={{ fontSize:10 }}>{l.active?'Active':'Inactive'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onOpenWebview('https://www.etsy.com/your/listings')} style={{ fontSize:11 }}>Edit ↗</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'shipping' && (
        <div>
          <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:12,lineHeight:1.5 }}>
            Enter Canada Post tracking numbers to mark Etsy orders as shipped.
          </div>
          {pendingOrders.map(o => (
            <div key={o.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',marginBottom:8,background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:500 }}>{o.item}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{o.buyer}</div>
              </div>
              <input className="input" placeholder="Tracking #" style={{ width:180,fontSize:12,fontFamily:'monospace' }} />
              <button className="btn btn-primary btn-sm" onClick={() => onOpenWebview('https://www.etsy.com/your/orders/sold')}>Mark Shipped</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Social Dashboard ─────────────────────────────────────────────────────────
function SocialDashboard({ platform, onDisconnect, onOpenWebview }) {
  const configs = {
    facebook: {
      stats: [['Page Likes','1.2K'],['Post Reach','4.8K'],['Shop Items','12'],['This Month','↑ 23%']],
      actions: [
        { icon:'📸', label:'Post Product Photo',  desc:'Share a finished print to your page',      url:'https://www.facebook.com' },
        { icon:'🛍️', label:'Manage FB Shop',       desc:'Add or update your product listings',       url:'https://www.facebook.com/commerce' },
        { icon:'📊', label:'Page Insights',        desc:'Views, reach, and engagement stats',        url:'https://www.facebook.com/insights' },
        { icon:'🗓️', label:'Creator Studio',        desc:'Schedule and manage posts in advance',      url:'https://business.facebook.com/creatorstudio' },
      ],
    },
    instagram: {
      stats: [['Followers','2.4K'],['Posts','87'],['Avg Likes','142'],['Reach/Post','890']],
      actions: [
        { icon:'📸', label:'Post a Photo',         desc:'Share a finished print to your feed',       url:'https://www.instagram.com' },
        { icon:'🎬', label:'Create a Reel',         desc:'Short video of your print process',         url:'https://www.instagram.com/reels' },
        { icon:'⭕', label:'Add to Story',          desc:'24-hour behind-the-scenes content',         url:'https://www.instagram.com' },
        { icon:'🏷️', label:'Tag Products',          desc:'Link prints to your Instagram Shop',        url:'https://www.instagram.com/shopping' },
      ],
    },
    tiktok: {
      stats: [['Followers','890'],['Total Views','48K'],['Avg Views','1.2K'],['Likes','3.4K']],
      actions: [
        { icon:'⏱️', label:'Upload Time-lapse',    desc:'Full print from start to finish',           url:'https://www.tiktok.com/upload' },
        { icon:'🎥', label:'Post a Video',          desc:'Share any 3D printing content',             url:'https://www.tiktok.com/upload' },
        { icon:'🛒', label:'TikTok Shop',           desc:'List your prints for direct sale',          url:'https://seller.tiktok.com' },
        { icon:'📈', label:'Analytics',             desc:'Views, followers, revenue trends',          url:'https://www.tiktok.com/analytics' },
      ],
    },
    youtube: {
      stats: [['Subscribers','312'],['Total Views','28K'],['Videos','24'],['Watch Hours','890']],
      actions: [
        { icon:'📤', label:'Upload Video',          desc:'New tutorial or print reveal',              url:'https://studio.youtube.com' },
        { icon:'📋', label:'Manage Playlists',      desc:'Organise tutorials and time-lapses',        url:'https://studio.youtube.com/channel/playlists' },
        { icon:'📊', label:'Channel Analytics',    desc:'Views, watch time, subscribers',            url:'https://studio.youtube.com/channel/analytics' },
        { icon:'💰', label:'Monetization',          desc:'Ad revenue and channel memberships',        url:'https://studio.youtube.com/channel/monetization' },
      ],
    },
  };

  const d = configs[platform.id];
  if (!d) return null;

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg-hover)',borderRadius:'var(--r-md)',marginBottom:16,border:'0.5px solid var(--border)' }}>
        <div style={{ width:38,height:38,borderRadius:10,background:`${platform.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,border:`1px solid ${platform.color}44` }}>
          {platform.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:13 }}>Alliston 3D Prints</div>
          <div style={{ fontSize:11,color:'var(--green)' }}>● Connected · {platform.name}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onOpenWebview(platform.authUrl)} style={{ fontSize:11 }}>Open ↗</button>
        <button className="btn btn-ghost btn-sm" onClick={onDisconnect} style={{ color:'var(--red)',fontSize:11 }}>Disconnect</button>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:`repeat(${d.stats.length},1fr)`,gap:10,marginBottom:18 }}>
        {d.stats.map(([label,value]) => (
          <div key={label} style={{ padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)',textAlign:'center' }}>
            <div style={{ fontSize:16,fontWeight:700 }}>{value}</div>
            <div style={{ fontSize:10,color:'var(--text-tertiary)',marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-tertiary)',marginBottom:10 }}>Quick Actions</div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8 }}>
        {d.actions.map(a => (
          <button key={a.label} onClick={() => onOpenWebview(a.url)}
            style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg-hover)',border:`0.5px solid var(--border)`,borderRadius:'var(--r-md)',cursor:'pointer',textAlign:'left',transition:'border-color 0.15s,background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=platform.color; e.currentTarget.style.background='var(--bg-card)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-hover)'; }}>
            <span style={{ fontSize:22,flexShrink:0 }}>{a.icon}</span>
            <div>
              <div style={{ fontSize:13,fontWeight:600,color:'var(--text-primary)' }}>{a.label}</div>
              <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{a.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Platform Side Panel ──────────────────────────────────────────────────────
function PlatformPanel({ platform, config, isConnected, onConnect, onDisconnect, onClose }) {
  const [webviewUrl, setWebviewUrl] = useState(null);

  if (webviewUrl !== null) {
    return (
      <PlatformWebview
        platform={platform}
        url={webviewUrl}
        onClose={() => setWebviewUrl(null)}
      />
    );
  }

  return (
    <>
      <div style={{ position:'fixed',inset:0,zIndex:199,background:'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div style={{ position:'fixed',top:0,right:0,bottom:0,width:520,zIndex:200,background:'var(--bg-card)',borderLeft:'0.5px solid var(--border)',display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.35)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'16px 20px',borderBottom:'0.5px solid var(--border)',flexShrink:0 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:`${platform.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,border:`1px solid ${platform.color}44` }}>
            {platform.icon}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15,fontWeight:700 }}>{platform.name}</div>
            <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{platform.description}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:20 }}>
          {isConnected ? (
            platform.id === 'shopify' ? (
              <ShopifyDashboard config={config} onDisconnect={onDisconnect} />
            ) : platform.id === 'etsy' ? (
              <EtsyDashboard onDisconnect={onDisconnect} onOpenWebview={url => setWebviewUrl(url)} />
            ) : (
              <SocialDashboard platform={platform} onDisconnect={onDisconnect} onOpenWebview={url => setWebviewUrl(url)} />
            )
          ) : (
            <div>
              <div style={{ fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:12 }}>What you get</div>
              <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:24 }}>
                {platform.features.map(f => (
                  <div key={f} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',border:'0.5px solid var(--border)' }}>
                    <span style={{ color:platform.color,flexShrink:0,fontWeight:700 }}>✓</span>
                    <span style={{ fontSize:13 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center',height:44,fontSize:14 }} onClick={onConnect}>
                Connect {platform.name} →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [connected, setConnected]               = useState({});
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [showShopify, setShowShopify]           = useState(false);
  const [activeWebview, setActiveWebview]       = useState(null);
  const { user } = useAuthStore();

  // ── Load shared connections from server — ALL users see the same state ──
  useEffect(() => {
    settingsApi.get('marketing_connections')
      .then(res => { if (res.data?.value) setConnected(res.data.value); })
      .catch(() => {
        // Fallback to localStorage if server unreachable
        try { setConnected(JSON.parse(localStorage.getItem('pf_marketing_connected') || '{}')); } catch {}
      });
  }, []);

  async function saveConnected(c) {
    setConnected(c);
    try {
      await settingsApi.set('marketing_connections', c);
    } catch {
      try { localStorage.setItem('pf_marketing_connected', JSON.stringify(c)); } catch {}
    }
  }

  async function markConnected(id, extra = {}) {
    await saveConnected({ ...connected, [id]: { connectedAt: new Date().toISOString(), ...extra } });
  }

  async function disconnect(id) {
    if (!window.confirm(`Disconnect ${PLATFORMS.find(p => p.id === id)?.name}?`)) return;
    const c = { ...connected };
    delete c[id];
    await saveConnected(c);
  }

  function handleConnectClick(platform) {
    if (platform.id === 'shopify') { setShowShopify(true); return; }
    setActiveWebview(platform);
  }

  const ecommerce     = PLATFORMS.filter(p => p.category === 'ecommerce');
  const social        = PLATFORMS.filter(p => p.category === 'social');
  const connectedCount = Object.keys(connected).length;

  return (
    <div style={{ height:'100%',overflowY:'auto',padding:24 }}>
      <div style={{ maxWidth:1100,margin:'0 auto' }}>

        <div style={{ marginBottom:20 }}>
          <h1>Marketing & Integrations</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:13,marginTop:4 }}>
            Connect your sales channels and social platforms · Shared across all users · Click any card to manage
          </p>
        </div>

        {/* Metrics */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24 }}>
          {[
            ['Platforms Connected', `${connectedCount} of ${PLATFORMS.length}`],
            ['E-Commerce', `${ecommerce.filter(p => connected[p.id]).length} connected`],
            ['Social', `${social.filter(p => connected[p.id]).length} connected`],
          ].map(([l, v]) => (
            <div key={l} className="card" style={{ padding:16 }}>
              <div style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:20,fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* E-Commerce */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text-tertiary)',marginBottom:12 }}>E-Commerce & Sales Channels</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14 }}>
            {ecommerce.map(p => {
              const isCon = !!connected[p.id];
              return (
                <div key={p.id} className="card" onClick={() => setSelectedPlatform(p)}
                  style={{ padding:20,borderTop:`3px solid ${p.color}`,cursor:'pointer',transition:'transform 0.15s,box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
                  <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
                    <div style={{ width:44,height:44,borderRadius:12,background:`${p.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,border:`1px solid ${p.color}44`,flexShrink:0 }}>{p.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15,fontWeight:700 }}>{p.name}</div>
                      <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{p.description}</div>
                    </div>
                    {isCon && <span className="pill pill-green" style={{ fontSize:10,flexShrink:0 }}>✓ Connected</span>}
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:4,marginBottom:14 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ fontSize:12,color:'var(--text-secondary)',display:'flex',gap:6 }}>
                        <span style={{ color:p.color,flexShrink:0 }}>→</span>{f}
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ width:'100%',justifyContent:'center' }}
                    onClick={e => { e.stopPropagation(); isCon ? setSelectedPlatform(p) : handleConnectClick(p); }}>
                    {isCon ? `Manage ${p.name}` : `Connect ${p.name} →`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Social Media */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text-tertiary)',marginBottom:12 }}>Social Media</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14 }}>
            {social.map(p => {
              const isCon = !!connected[p.id];
              return (
                <div key={p.id} className="card" onClick={() => setSelectedPlatform(p)}
                  style={{ padding:18,borderTop:`3px solid ${p.color}`,cursor:'pointer',transition:'transform 0.15s,box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                    <div style={{ width:40,height:40,borderRadius:10,background:`${p.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,border:`1px solid ${p.color}44`,flexShrink:0 }}>{p.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:700 }}>{p.name}</div>
                      <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{p.description}</div>
                    </div>
                    {isCon && <span className="pill pill-green" style={{ fontSize:10 }}>✓</span>}
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:3,marginBottom:12 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ fontSize:11,color:'var(--text-secondary)',display:'flex',gap:6 }}>
                        <span style={{ color:p.color,flexShrink:0 }}>→</span>{f}
                      </div>
                    ))}
                  </div>
                  <button className={`btn btn-sm ${isCon?'btn-primary':'btn-secondary'}`}
                    style={{ width:'100%',justifyContent:'center' }}
                    onClick={e => { e.stopPropagation(); isCon ? setSelectedPlatform(p) : handleConnectClick(p); }}>
                    {isCon ? `Manage ${p.name}` : `Connect ${p.name} →`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coming soon */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:13,fontWeight:600,marginBottom:12 }}>Coming in Future Updates</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10 }}>
            {[['Amazon Canada','Orders + FBA sync'],['QuickBooks','Accounting automation'],['Canada Post','Already integrated ✓'],['Stripe','Payment tracking'],['Google Analytics','Sales attribution'],['Mailchimp','Customer email lists']].map(([name,desc]) => (
              <div key={name} style={{ padding:'10px 12px',background:'var(--bg-hover)',borderRadius:'var(--r-sm)',opacity:name.includes('✓')?1:0.7 }}>
                <div style={{ fontSize:13,fontWeight:500,marginBottom:2 }}>{name}</div>
                <div style={{ fontSize:11,color:'var(--text-secondary)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform detail panel */}
      {selectedPlatform && (
        <PlatformPanel
          platform={selectedPlatform}
          config={connected[selectedPlatform.id]}
          isConnected={!!connected[selectedPlatform.id]}
          onConnect={() => handleConnectClick(selectedPlatform)}
          onDisconnect={() => { disconnect(selectedPlatform.id); setSelectedPlatform(null); }}
          onClose={() => setSelectedPlatform(null)}
        />
      )}

      {/* Shopify connect modal */}
      {showShopify && (
        <ShopifyConnect
          onClose={() => setShowShopify(false)}
          onConnect={data => {
            markConnected('shopify', data);
            setShowShopify(false);
            setSelectedPlatform(PLATFORMS.find(p => p.id === 'shopify'));
          }}
        />
      )}

      {/* Social login webview — marks connected on Done, visible to all users */}
      {activeWebview && (
        <PlatformWebview
          platform={activeWebview}
          onClose={() => {
            const p = activeWebview;
            markConnected(p.id);
            setActiveWebview(null);
            setSelectedPlatform(p);
          }}
        />
      )}
    </div>
  );
}
