import React, { useState, useEffect } from 'react';
import {
  motion,
  AnimatePresence
} from 'motion/react';
import {
  Database,
  ShoppingCart,
  Search,
  RefreshCw,
  Send,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Terminal,
  Activity,
  CheckCircle,
  FileCode,
  Info,
  X,
  CreditCard,
  ArrowRight,
  Clipboard,
  Check,
  Download,
  AlertCircle,
  Globe,
  Sliders,
  Play
} from 'lucide-react';

// Types
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  stock: number;
  imageUrl: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

interface ApiLog {
  method: string;
  url: string;
  body?: string;
  status: number;
  response: any;
  timestamp: string;
}

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  payloadTemplate?: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/products',
    description: 'Fetch all products. Supports filters: ?category=Electronics&search=Headphones&minPrice=50&maxPrice=300&inStock=true'
  },
  {
    method: 'GET',
    path: '/api/products/stats',
    description: 'Get total product statistics, distinct categories, and valuation of warehouse stock.'
  },
  {
    method: 'GET',
    path: '/api/products/P101',
    description: 'Fetch detailed product attributes for a specific product ID (e.g. P101).'
  },
  {
    method: 'POST',
    path: '/api/products',
    description: 'Create a new product row in the Excel sheet.',
    payloadTemplate: JSON.stringify({
      id: "P109",
      name: "Ultra HD Pro Projector",
      category: "Electronics",
      price: 549.99,
      stock: 12,
      description: "Next-generation 4K ultra-short-throw smart projector with integrated high-fidelity sound.",
      imageUrl: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=500&q=80"
    }, null, 2)
  },
  {
    method: 'PUT',
    path: '/api/products/P101',
    description: 'Modify product attributes dynamically inside the Excel sheet.',
    payloadTemplate: JSON.stringify({
      price: 189.99,
      stock: 40
    }, null, 2)
  },
  {
    method: 'DELETE',
    path: '/api/products/P108',
    description: 'Surgically delete a product row from the Excel file database.'
  },
  {
    method: 'GET',
    path: '/api/cart',
    description: 'Get current items in the Excel Cart sheet along with receipt summaries (subtotal, shipping, tax).'
  },
  {
    method: 'POST',
    path: '/api/cart',
    description: 'Add a product to the cart or increment its quantity inside the workbook.',
    payloadTemplate: JSON.stringify({
      productId: "P101",
      quantity: 1
    }, null, 2)
  },
  {
    method: 'PUT',
    path: '/api/cart/P101',
    description: 'Set custom exact item quantity in the Cart sheet.',
    payloadTemplate: JSON.stringify({
      quantity: 3
    }, null, 2)
  },
  {
    method: 'DELETE',
    path: '/api/cart/P101',
    description: 'Remove a specific item line from the Cart sheet.'
  },
  {
    method: 'POST',
    path: '/api/cart/clear',
    description: 'Completely wipe all rows from the Cart sheet.'
  },
  {
    method: 'POST',
    path: '/api/cart/checkout',
    description: 'Atomically deduct quantities from products stock, clear cart, and generate a receipts payload.'
  },
  {
    method: 'GET',
    path: '/api/database/raw',
    description: 'Returns raw sheet data representation and file stats.'
  },
  {
    method: 'GET',
    path: '/api/database/download',
    description: 'Downloads the actual live, physical Excel binary file (.xlsx) directly!'
  },
  {
    method: 'POST',
    path: '/api/database/reset',
    description: 'Restore the factory seed product rows and clear active cart logs.'
  }
];

export default function App() {
  // Backend states
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary>({ subtotal: 0, shipping: 0, tax: 0, total: 0 });
  const [dbMeta, setDbMeta] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active testing panel tab
  const [activeSubTab, setActiveSubTab] = useState<'endpoints' | 'sheets' | 'console'>('endpoints');

  // Interactive REST Client / Playground
  const [clientMethod, setClientMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [clientPath, setClientPath] = useState('/api/products/stats');
  const [clientBody, setClientBody] = useState('');
  const [clientResponse, setClientResponse] = useState<any>(null);
  const [clientStatus, setClientStatus] = useState<number | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  // Live incoming API logs stream from server
  const [liveLogs, setLiveLogs] = useState<ApiLog[]>([]);

  // Feedback notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Toast notifier helper
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync state from backend API
  const syncServerState = async (silently = false) => {
    if (!silently) setLoading(true);
    try {
      // Products
      const pRes = await fetch('/api/products');
      const pData = await pRes.json();
      if (pData.success) setProducts(pData.data);

      // Cart
      const cRes = await fetch('/api/cart');
      const cData = await cRes.json();
      if (cData.success) {
        setCart(cData.data);
        setCartSummary(cData.summary);
      }

      // Metadata & Stats
      const rRes = await fetch('/api/database/raw');
      const rData = await rRes.json();
      if (rData.success) setDbMeta(rData.metadata);

      const sRes = await fetch('/api/products/stats');
      const sData = await sRes.json();
      if (sData.success) setStats(sData.stats);
    } catch (err) {
      console.error('Server sync error:', err);
      if (!silently) {
        triggerToast('Failed to reach local server on Port 3000.', 'error');
      }
    } finally {
      if (!silently) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    syncServerState();
    // Setup a mild interval to pull server activity logs or meta shifts silently
    const interval = setInterval(() => {
      syncServerState(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Quick Action: Send customized request
  const executeRestCall = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, payload = '') => {
    setClientLoading(true);
    setClientMethod(method);
    setClientPath(endpoint);
    setClientBody(payload);
    setActiveSubTab('endpoints');

    try {
      const opts: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      if (['POST', 'PUT'].includes(method) && payload) {
        try {
          JSON.parse(payload); // Ensure valid JSON before dispatching
          opts.body = payload;
        } catch {
          triggerToast('Invalid JSON provided in payload.', 'error');
          setClientLoading(false);
          return;
        }
      }

      const response = await fetch(endpoint, opts);
      const data = await response.json();
      
      setClientStatus(response.status);
      setClientResponse(data);

      // Log this transaction locally as well
      const newLog: ApiLog = {
        method,
        url: endpoint,
        body: payload ? payload : undefined,
        status: response.status,
        response: data,
        timestamp: new Date().toLocaleTimeString()
      };
      setLiveLogs(prev => [newLog, ...prev].slice(0, 20));

      triggerToast(`HTTP ${response.status} Success`, response.ok ? 'success' : 'error');
      
      // Update data immediately
      syncServerState(true);
    } catch (err: any) {
      setClientStatus(500);
      setClientResponse({ success: false, error: err.message });
      triggerToast('Local server request failed.', 'error');
    } finally {
      setClientLoading(false);
    }
  };

  // Copy helper
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(label);
    triggerToast(`Copied ${label} to clipboard!`, 'success');
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Reset Excel DB Workbook
  const handleReset = async () => {
    if (!window.confirm('Reset Excel workbook to initial factory seed data? This deletes custom sheets, clears current cart, and resets product stocks.')) return;
    try {
      const res = await fetch('/api/database/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        triggerToast('Excel workbook wiped and successfully seeded!', 'success');
        syncServerState();
      } else {
        triggerToast('Failed to reset workbook.', 'error');
      }
    } catch (err: any) {
      triggerToast(err.message, 'error');
    }
  };

  // Generate dynamic curl command snippet
  const generateCurl = (method: string, path: string, body?: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    let curl = `curl -X ${method} "${fullUrl}"`;
    if (body && ['POST', 'PUT'].includes(method)) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Dynamic Notification Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4.5 py-3.5 rounded-2xl border text-xs shadow-2xl backdrop-blur-md max-w-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                : 'bg-cyan-950/90 text-cyan-300 border-cyan-500/30'
            }`}
          >
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-indigo-500 p-2.5 rounded-2xl text-slate-950 shadow-lg shadow-cyan-500/10">
              <Database className="w-5 h-5 font-extrabold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-50 uppercase tracking-wider">E-Commerce REST API Backend</h1>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                  ONLINE: PORT 3000
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">No auth required &bull; Persistent Excel Spreadsheet storage &bull; Perfect for Postman</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/api/database/download"
              download
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Download live ecommerce_db.xlsx spreadsheet file"
            >
              <Download className="w-3.5 h-3.5" />
              Download Excel File
            </a>

            <button
              onClick={handleReset}
              className="bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Re-seed the spreadsheet rows back to default state"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset DB Rows
            </button>
          </div>

        </div>
      </header>

      {/* CORE WORKSPACE */}
      <main className="max-w-7xl mx-auto p-4 lg:p-6 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE SPREADSHEET MONITOR & ANALYTICS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* EXCEL SHEET FILE MONITOR CARD */}
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <FileSpreadsheet className="w-36 h-36 text-emerald-500" />
            </div>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-900">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Spreadsheet Database File Meta
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                ACID Engine
              </span>
            </div>

            {dbMeta ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-xl border border-slate-900/50">
                  <span className="text-slate-400 font-mono">DB File Name</span>
                  <span className="font-mono font-bold text-slate-100">{dbMeta.fileName}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-xl border border-slate-900/50">
                  <span className="text-slate-400 font-mono">Total File Size</span>
                  <span className="font-mono font-bold text-emerald-400">{dbMeta.fileSize}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-xl border border-slate-900/50">
                  <span className="text-slate-400 font-mono">Disk Path</span>
                  <span className="font-mono text-slate-300 text-[10px] break-all max-w-[200px] text-right" title={dbMeta.filePath}>
                    .../ecommerce_db.xlsx
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-xl border border-slate-900/50">
                  <span className="text-slate-400 font-mono">Last Write Epoch</span>
                  <span className="font-mono font-bold text-slate-300">
                    {new Date(dbMeta.lastModified).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Checking spreadsheet metadata status...
              </div>
            )}
          </div>

          {/* TOTAL PRODUCT & CART SHEET ANALYTICS */}
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live In-Memory Statistics
              </span>
              <button
                onClick={() => syncServerState()}
                className="text-slate-500 hover:text-white transition-colors"
                title="Sync database stats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {stats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-900 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Total Product Rows</span>
                  <span className="text-2xl font-black text-white font-mono mt-1">{stats.totalProducts}</span>
                  <span className="text-[10px] text-slate-500 mt-1">Sheet "Products" Tab</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-900 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Total Stock Count</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-1">{stats.totalStockCount}</span>
                  <span className="text-[10px] text-slate-500 mt-1">Sum of Product Stocks</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-900 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Warehouse Value</span>
                  <span className="text-xl font-bold text-indigo-400 font-mono mt-1">${stats.totalInventoryValue?.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 mt-1">Total Valuation</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-900 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Active Cart Items</span>
                  <span className="text-2xl font-black text-cyan-400 font-mono mt-1">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Sheet "Cart" Tab Rows</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Fetching database stats...
              </div>
            )}

            {/* Quick Pricing Summary Info */}
            <div className="bg-slate-900/40 p-4.5 rounded-2xl border border-slate-900/80 text-xs text-slate-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-slate-200">
                <ShoppingCart className="w-3.5 h-3.5 text-cyan-400" />
                Excel Cart Summary Tab Details
              </div>
              <div className="space-y-1 text-slate-400 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-slate-200 font-bold">${cartSummary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span className="text-slate-200">
                    {cartSummary.shipping === 0 ? 'FREE' : `$${cartSummary.shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Tax (8%):</span>
                  <span className="text-slate-200">${cartSummary.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 mt-1.5 flex justify-between font-bold text-slate-100 text-xs">
                  <span>Total Due:</span>
                  <span className="text-cyan-400 font-extrabold">${cartSummary.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* POSTMAN PRO-TIP CARD */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-900/30 rounded-3xl p-5 space-y-3 shadow-2xl">
            <h3 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-400" />
              Testing with postman or curl
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This backend server provides a complete set of RESTful endpoints that map directly to the spreadsheet database sheets. 
              Since there is <strong>no auth mechanism</strong>, you can instantly issue calls from your terminal or Postman.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[10px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-200">Active Host Endpoint:</div>
              <div className="text-cyan-400 break-all select-all font-semibold">
                {window.location.origin}
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              Any payload updates will automatically propagate to the underlying Excel spreadsheets!
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ENDPOINT DOCUMENTATION & REST API SANDBOX */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* TABS SELECTOR FOR RIGHT COMPONENT */}
          <div className="bg-slate-950 p-1 rounded-2xl flex border border-slate-900 shadow-inner">
            <button
              onClick={() => setActiveSubTab('endpoints')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'endpoints'
                  ? 'bg-slate-900 text-cyan-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Endpoints & REST Client
            </button>
            <button
              onClick={() => setActiveSubTab('sheets')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'sheets'
                  ? 'bg-slate-900 text-cyan-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Exposed Sheet Tab Rows
            </button>
            <button
              onClick={() => setActiveSubTab('console')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeSubTab === 'console'
                  ? 'bg-slate-900 text-cyan-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Terminal Console
              {liveLogs.length > 0 && (
                <span className="absolute -top-1 right-2 bg-cyan-500 text-slate-950 text-[9px] font-bold px-1 rounded">
                  {liveLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: ENDPOINTS & PLAYGROUND CLIENT */}
          {activeSubTab === 'endpoints' && (
            <div className="space-y-6">
              
              {/* REST CLIENT INJECTOR BOX */}
              <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    Built-in REST Client Playground
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Sandbox Mode</span>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); executeRestCall(clientMethod, clientPath, clientBody); }} className="space-y-4">
                  <div className="flex gap-2">
                    <select
                      value={clientMethod}
                      onChange={(e) => setClientMethod(e.target.value as any)}
                      className="bg-slate-900 border border-slate-800 text-xs font-bold rounded-xl px-3 py-2 text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>

                    <input
                      type="text"
                      value={clientPath}
                      onChange={(e) => setClientPath(e.target.value)}
                      placeholder="/api/products"
                      className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-slate-600"
                    />

                    <button
                      type="submit"
                      disabled={clientLoading}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 font-bold" />
                      <span>Send</span>
                    </button>
                  </div>

                  {/* Body Textarea if POST/PUT */}
                  {['POST', 'PUT'].includes(clientMethod) && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-mono block">JSON Request Body Payload</label>
                      <textarea
                        value={clientBody}
                        onChange={(e) => setClientBody(e.target.value)}
                        placeholder={`{\n  "stock": 50,\n  "price": 19.99\n}`}
                        className="w-full h-24 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                      />
                    </div>
                  )}
                </form>

                {/* Response Preview */}
                {clientStatus !== null && (
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 uppercase">Response payload:</span>
                      <span className={`font-bold font-mono px-2 py-0.5 rounded ${clientStatus >= 200 && clientStatus < 300 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                        HTTP {clientStatus}
                      </span>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-4 overflow-auto max-h-56 border border-slate-900/60 font-mono text-[11px] text-cyan-300">
                      <pre>{JSON.stringify(clientResponse, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* ENDPOINTS DOCUMENTATION & SAMPLES */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Interactive API Endpoint Registry
                </span>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {ENDPOINTS.map((ep, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-3 hover:border-slate-800 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-md ${
                            ep.method === 'GET' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                            ep.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            ep.method === 'PUT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {ep.method}
                          </span>
                          <span className="font-mono text-xs font-bold text-white selection:bg-cyan-500 select-all">
                            {ep.path}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => executeRestCall(ep.method, ep.path, ep.payloadTemplate)}
                            className="bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-cyan-400 border border-slate-800 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Execute Sandbox
                          </button>
                          <button
                            onClick={() => copyText(generateCurl(ep.method, ep.path, ep.payloadTemplate), `cURL ${ep.path}`)}
                            className="text-slate-500 hover:text-slate-300 p-1"
                            title="Copy cURL Command for Postman/Terminal"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400">
                        {ep.description}
                      </p>

                      {ep.payloadTemplate && (
                        <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-900/60">
                          <div className="text-[9px] text-slate-500 uppercase font-mono font-bold mb-1">Payload template</div>
                          <pre className="font-mono text-[10px] text-slate-300 max-h-24 overflow-y-auto">{ep.payloadTemplate}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EXPOSED SHEET ROWS (EXCEL TABULAR VIEW) */}
          {activeSubTab === 'sheets' && (
            <div className="space-y-6">
              
              <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 shadow-2xl space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Tab 1: "Products" Sheet Row Grid
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Reads binary Excel data cells asynchronously via XLSX</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">({products.length} Products)</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-900 bg-slate-950">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-900/50 text-slate-400 font-mono text-[10px]">
                        <th className="p-3">ID (A)</th>
                        <th className="p-3">Name (B)</th>
                        <th className="p-3">Category (C)</th>
                        <th className="p-3">Price (D)</th>
                        <th className="p-3">Stock (E)</th>
                        <th className="p-3">Description (F)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-mono text-[11px] text-slate-300">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/20">
                          <td className="p-3 text-cyan-400 font-bold">{p.id}</td>
                          <td className="p-3 text-white font-medium max-w-[140px] truncate" title={p.name}>{p.name}</td>
                          <td className="p-3 text-slate-400">{p.category}</td>
                          <td className="p-3 font-semibold text-emerald-400">${p.price.toFixed(2)}</td>
                          <td className="p-3 font-bold text-slate-200">{p.stock}</td>
                          <td className="p-3 text-slate-500 max-w-[180px] truncate" title={p.description}>{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

              <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 shadow-2xl space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <ShoppingCart className="w-4 h-4 text-cyan-400" />
                      Tab 2: "Cart" Sheet Row Grid
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Calculated subtotal details and stock reservation rows</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">({cart.length} Cart Items)</span>
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-900 rounded-2xl">
                    No rows currently occupied in the Cart sheet. Add products via Postman or built-in REST Client!
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-900 bg-slate-950">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 bg-slate-900/50 text-slate-400 font-mono text-[10px]">
                          <th className="p-3">Product ID (A)</th>
                          <th className="p-3">Product Name (B)</th>
                          <th className="p-3">Price (C)</th>
                          <th className="p-3">Quantity (D)</th>
                          <th className="p-3">Subtotal (E)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-mono text-[11px] text-slate-300">
                        {cart.map((item) => (
                          <tr key={item.productId} className="hover:bg-slate-900/20">
                            <td className="p-3 text-cyan-400 font-bold">{item.productId}</td>
                            <td className="p-3 text-white font-medium max-w-[140px] truncate" title={item.name}>{item.name}</td>
                            <td className="p-3 text-slate-400">${item.price.toFixed(2)}</td>
                            <td className="p-3 font-extrabold text-cyan-400">{item.quantity}</td>
                            <td className="p-3 font-semibold text-emerald-400">${(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 3: LIVE TERMINAL CONSOLE */}
          {activeSubTab === 'console' && (
            <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 shadow-2xl space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Live Server Traffic Logs Stream
                  </span>
                </div>
                <button
                  onClick={() => setLiveLogs([])}
                  className="text-[10px] text-slate-500 hover:text-cyan-400 font-mono font-bold transition-colors"
                >
                  Wipe Terminal Logs
                </button>
              </div>

              {liveLogs.length === 0 ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-900 rounded-2xl py-14 text-center font-mono text-xs text-slate-500 space-y-2">
                  <div>No requests caught on this stream yet.</div>
                  <div className="text-[10px] text-slate-600">Make requests to the server endpoints using Postman or the sandbox above!</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto font-mono text-xs">
                  {liveLogs.map((log, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-900 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            log.method === 'GET' ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-900/50' :
                            log.method === 'POST' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-950/50' :
                            log.method === 'PUT' ? 'bg-amber-950/80 text-amber-400 border border-amber-950/50' :
                            'bg-rose-950/80 text-rose-400 border border-rose-950/50'
                          }`}>
                            {log.method}
                          </span>
                          <span className="text-slate-200">{log.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-normal">{log.timestamp}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${log.status >= 200 && log.status < 300 ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'}`}>
                            {log.status}
                          </span>
                        </div>
                      </div>

                      {log.body && (
                        <div className="bg-slate-950/80 p-2 rounded-xl text-[10px] border border-slate-900/80">
                          <div className="text-slate-600 mb-1 font-bold">REQUEST BODY payload</div>
                          <pre className="text-slate-300 text-left overflow-auto max-h-20">{log.body}</pre>
                        </div>
                      )}

                      <div className="bg-slate-950/80 p-2 rounded-xl text-[10px] border border-slate-900/80">
                        <div className="text-slate-600 mb-1 font-bold">RESPONSE payload</div>
                        <pre className="text-cyan-400 text-left overflow-auto max-h-36">{JSON.stringify(log.response, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

      </main>

      {/* FOOTER BAR */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-4.5 text-center text-xs text-slate-500 font-mono">
        <p>&copy; {new Date().getFullYear()} E-Commerce Excel Database Backend REST APIs. Built with Node.js, Express, and XLSX Sheet Storage.</p>
      </footer>

    </div>
  );
}
