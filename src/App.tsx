import React, { useState, useCallback, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Upload, 
  Camera, 
  RefreshCw, 
  AlertCircle, 
  ChevronRight,
  History,
  Activity,
  Cpu,
  Database,
  LayoutDashboard,
  Wallet,
  PieChart,
  Users,
  Settings,
  Plus,
  ShoppingCart,
  Truck,
  Home,
  MoreHorizontal,
  DollarSign,
  MessageSquare,
  Target,
  Maximize,
  LogOut,
  Bell,
  ExternalLink,
  Search,
  AlertTriangle,
  CheckCircle,
  Star,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { verifyProductImage, VerificationResult } from './services/gemini';
import { ChatBot } from './components/ChatBot';
import { auth, signInWithGoogle, logout, syncUserProfile, saveScan, getScans } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// --- Types ---
interface ScanHistoryItem {
  id: string;
  timestamp: number;
  productName: string;
  brandName?: string;
  manufacturingLocation?: string;
  estimatedPrice?: string;
  isGenuine: boolean;
  confidence: number;
  image: string;
}

// --- Mock Data for Chart ---
const chartData = [
  { day: '01', value: 400 },
  { day: '02', value: 300 },
  { day: '03', value: 500 },
  { day: '04', value: 200 },
  { day: '05', value: 600 },
  { day: '06', value: 450 },
  { day: '07', value: 700 },
  { day: '08', value: 350 },
  { day: '09', value: 550 },
  { day: '10', value: 400 },
  { day: '11', value: 650 },
  { day: '12', value: 300 },
  { day: '13', value: 500 },
  { day: '14', value: 450 },
  { day: '15', value: 600 },
  { day: '16', value: 250 },
  { day: '17', value: 550 },
  { day: '18', value: 400 },
  { day: '19', value: 700 },
  { day: '20', value: 500 },
  { day: '21', value: 350 },
  { day: '22', value: 600 },
  { day: '23', value: 850, active: true }, // Highlighted bar
  { day: '24', value: 400 },
  { day: '25', value: 500 },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Expenses');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Neural Core Online', message: 'System synchronization complete.', time: 'Just now', read: false },
    { id: 2, title: 'New Scan Logged', message: 'Product verification successful.', time: '2 mins ago', read: false },
    { id: 3, title: 'Security Update', message: 'Database rules have been hardened.', time: '1 hour ago', read: true },
  ]);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const [sellingPrice, setSellingPrice] = useState('');
  const [sellerDetails, setSellerDetails] = useState('');
  const [customerReviews, setCustomerReviews] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const [backendStatus, setBackendStatus] = useState<string>('Connecting...');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setBackendStatus(data.status))
      .catch(() => setBackendStatus('Offline'));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
        getScans(currentUser.uid, (scans) => {
          setHistory(scans);
        });
      } else {
        setHistory([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setError(null);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleAnalyze = async () => {
    if (!image || !user) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const mimeType = image.split(';')[0].split(':')[1];
      const analysisResult = await verifyProductImage(image, mimeType, {
        sellingPrice,
        sellerDetails,
        customerReviews
      });
      console.log("Analysis Result:", analysisResult);
      setResult(analysisResult);
      
      const scanData = {
        productName: analysisResult.detectedProduct || 'UNKNOWN SPECIMEN',
        brandName: analysisResult.brandName,
        manufacturingLocation: analysisResult.manufacturingLocation,
        manufactureDate: analysisResult.manufactureDate,
        manufacturePlace: analysisResult.manufacturePlace,
        estimatedPrice: analysisResult.estimatedPrice,
        isGenuine: analysisResult.isGenuine,
        confidence: analysisResult.confidence,
        image: image,
        reasoning: analysisResult.reasoning,
        anomalies: analysisResult.anomalies,
        tips: analysisResult.tips
      };
      
      console.log("Saving scan to Firestore...");
      await saveScan(user.uid, scanData);
      console.log("Scan saved successfully.");
      
      // Update local history as well to ensure immediate UI feedback
      setHistory(prev => [{ ...scanData, id: Date.now().toString(), timestamp: Date.now() }, ...prev]);
    } catch (err: any) {
      setError(err.message || "ANALYSIS_FAILED: Neural core synchronization lost.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Scanner', icon: Maximize },
    { label: 'Marketplace', icon: ShoppingCart },
    { label: 'Risk Map', icon: AlertCircle },
    { label: 'Expenses', icon: Wallet },
    { label: 'Accounts', icon: Users },
    { label: 'Settings', icon: Settings },
    { label: 'Logout', icon: LogOut },
  ];

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <RefreshCw className="text-blue-500 animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[40px] p-12 text-center shadow-2xl"
        >
          <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <ShieldCheck className="text-blue-500" size={48} />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4">VeriCheck AI</h1>
          <p className="text-gray-500 font-medium mb-12">Secure product authenticity verification powered by neural intelligence.</p>
          
          <button 
            onClick={signInWithGoogle}
            className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-4 shadow-lg"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardView history={history} />;
      case 'Scanner':
        return (
          <ScannerView 
            image={image}
            setImage={setImage}
            isAnalyzing={isAnalyzing}
            result={result}
            setResult={setResult}
            error={error}
            handleAnalyze={handleAnalyze}
            sellingPrice={sellingPrice}
            setSellingPrice={setSellingPrice}
            sellerDetails={sellerDetails}
            setSellerDetails={setSellerDetails}
            customerReviews={customerReviews}
            setCustomerReviews={setCustomerReviews}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            darkMode={darkMode}
          />
        );
      case 'Risk Map':
        return <RiskMapView />;
      case 'Marketplace':
        return <MarketplaceView />;
      case 'Expenses':
        return <ExpensesView history={history} />;
      case 'Accounts':
        return <AccountsView user={user} />;
      case 'Settings':
        return <SettingsView user={user} darkMode={darkMode} setDarkMode={setDarkMode} />;
      case 'Logout':
        return <LogoutView logout={logout} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400 mb-6">
              <Settings size={48} />
            </div>
            <h2 className="text-3xl font-black">{activeTab}</h2>
            <p className="text-gray-500 mt-2">This module is currently under maintenance or being provisioned.</p>
          </div>
        );
    }
  };

  return (
    <div className={`dashboard-container ${darkMode ? 'dark bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${darkMode ? 'bg-black border-r border-white/10' : ''}`}>
        <div className="px-12 mb-16">
          <div className="relative w-20 h-20 mb-6">
            <img 
              src={user.photoURL || "https://picsum.photos/seed/samantha/200"} 
              alt="Profile" 
              className="w-full h-full rounded-2xl object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-4 border-black flex items-center justify-center text-[10px] text-white font-bold">
              {history.length}
            </div>
          </div>
          <h2 className="text-white text-3xl font-extrabold tracking-tight truncate">{user.displayName?.split(' ')[0] || 'User'}</h2>
          <p className="text-[#929292] text-sm mt-1 truncate">{user.email}</p>
        </div>

        <nav className="flex-1">
          {navItems.map((item) => (
            <div 
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`nav-item ${activeTab === item.label ? 'active' : ''}`}
            >
              <item.icon size={24} />
              {item.label}
            </div>
          ))}
        </nav>

        <div className="px-12 py-8 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${backendStatus === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#929292]">
              Backend: {backendStatus === 'ok' ? 'Online' : backendStatus}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-12 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center">
              {(() => {
                const Icon = navItems.find(n => n.label === activeTab)?.icon || LayoutDashboard;
                return <Icon size={24} className="text-blue-500" />;
              })()}
            </div>
            <h2 className="text-2xl font-black tracking-tight">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative ${
                  showNotifications ? 'bg-black text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-black" />
                )}
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 bg-white dark:bg-[#1a1a1a] rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 z-50 overflow-hidden"
                  >
                    <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                      <h3 className="font-black text-sm uppercase tracking-widest">Notifications</h3>
                      <button 
                        onClick={() => setNotifications(n => n.map(notif => ({ ...notif, read: true })))}
                        className="text-[10px] font-bold text-blue-500 uppercase tracking-wider hover:underline"
                      >
                        Mark all as read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`p-6 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}
                            onClick={() => {
                              setNotifications(prev => prev.map(n => n.id === notif.id ? { ...notif, read: true } : n));
                            }}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-sm">{notif.title}</h4>
                              <span className="text-[10px] text-gray-400 font-medium">{notif.time}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{notif.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center">
                          <p className="text-sm text-gray-400 font-medium">No new notifications</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 text-center">
                      <button 
                        onClick={() => { setActiveTab('Dashboard'); setShowNotifications(false); }}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                      >
                        View all activity
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-10 w-[1px] bg-gray-100 dark:bg-white/10" />

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black truncate max-w-[120px]">{user.displayName}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pro Member</p>
              </div>
              <img 
                src={user.photoURL || ""} 
                className="w-12 h-12 rounded-2xl object-cover border-2 border-gray-100 dark:border-white/10" 
                alt="User"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {renderContent()}
        </div>
      </main>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}

// --- Sub-Views ---

const DashboardView = ({ history }: { history: any[] }) => {
  const genuineCount = history.filter(h => h.isGenuine).length;
  const fakeCount = history.length - genuineCount;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-4">Dashboard</h1>
          <p className="text-[#929292] font-medium text-lg">System Overview & Analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="p-8 bg-blue-600 text-white rounded-[40px] shadow-2xl shadow-blue-500/20 flex flex-col justify-between h-48">
          <div className="flex justify-between items-start">
            <p className="status-label text-white/60">Total Scans</p>
            <Activity size={24} className="text-white/40" />
          </div>
          <h3 className="text-6xl font-black">{history.length}</h3>
        </div>
        <div className="p-8 bg-emerald-500 text-white rounded-[40px] shadow-2xl shadow-emerald-500/20 flex flex-col justify-between h-48">
          <div className="flex justify-between items-start">
            <p className="status-label text-white/60">Authentic</p>
            <ShieldCheck size={24} className="text-white/40" />
          </div>
          <h3 className="text-6xl font-black">{genuineCount}</h3>
        </div>
        <div className="p-8 bg-rose-500 text-white rounded-[40px] shadow-2xl shadow-rose-500/20 flex flex-col justify-between h-48">
          <div className="flex justify-between items-start">
            <p className="status-label text-white/60">Counterfeits</p>
            <ShieldAlert size={24} className="text-white/40" />
          </div>
          <h3 className="text-6xl font-black">{fakeCount}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="p-10 border border-gray-100 dark:border-white/10 rounded-[40px] bg-gray-50 dark:bg-white/5">
          <h3 className="text-2xl font-black mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {history.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-50 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${item.isGenuine ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {item.isGenuine ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                  </div>
                  <div>
                    <p className="font-bold">{item.productName}</p>
                    <p className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            ))}
          </div>
        </div>
        <div className="p-10 border border-gray-100 dark:border-white/10 rounded-[40px] bg-gray-50 dark:bg-white/5 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/20 text-blue-500 rounded-3xl flex items-center justify-center mb-6">
            <Target size={40} />
          </div>
          <h3 className="text-2xl font-black mb-2">Neural Accuracy</h3>
          <p className="text-gray-500 dark:text-gray-400 font-medium">System operating at 99.98% precision across global nodes.</p>
        </div>
      </div>
    </motion.div>
  );
};

const ScannerView = ({ 
  image, setImage, isAnalyzing, result, setResult, error, handleAnalyze,
  sellingPrice, setSellingPrice, sellerDetails, setSellerDetails,
  customerReviews, setCustomerReviews, getRootProps, getInputProps, isDragActive,
  darkMode
}: any) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-4">Scanner</h1>
          <p className="text-[#929292] font-medium text-lg">Product & QR Code Verification</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          {!result && !isAnalyzing && (
            <div 
              {...getRootProps()} 
              className={`w-full p-20 border-2 border-dashed rounded-[60px] transition-all flex flex-col items-center justify-center gap-6
                ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 bg-gray-50 dark:bg-white/5'}`}
            >
              <input {...getInputProps()} />
              <div className="w-24 h-24 bg-white dark:bg-white/10 rounded-[32px] shadow-xl flex items-center justify-center text-gray-400">
                <Upload size={48} />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black">Upload Specimen</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Supports Product Photos, Barcodes, and QR Codes</p>
              </div>
            </div>
          )}

          {image && !result && (
            <div className="space-y-8">
              <div className="relative aspect-video rounded-[60px] overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-inner">
                <img src={image} className="w-full h-full object-contain" />
                {isAnalyzing && <div className="scan-line" />}
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="status-label ml-2">Selling Price</label>
                  <input 
                    placeholder="e.g. ₹2000" 
                    className="w-full p-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl outline-none focus:border-blue-500 transition-all font-bold"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="status-label ml-2">Seller Details</label>
                  <input 
                    placeholder="Name/Rating" 
                    className="w-full p-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl outline-none focus:border-blue-500 transition-all font-bold"
                    value={sellerDetails}
                    onChange={(e) => setSellerDetails(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="status-label ml-2">Reviews</label>
                  <input 
                    placeholder="Paste text" 
                    className="w-full p-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl outline-none focus:border-blue-500 transition-all font-bold"
                    value={customerReviews}
                    onChange={(e) => setCustomerReviews(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl flex items-start gap-4">
                  <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-rose-600 dark:text-rose-400">Scanner Error</h4>
                    <p className="text-sm font-medium text-rose-500 dark:text-rose-300 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`w-full py-6 rounded-[32px] font-black text-xl uppercase tracking-widest transition-all flex items-center justify-center gap-4 shadow-2xl
                  ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-black hover:bg-gray-800 text-white'}`}
              >
                {isAnalyzing ? <RefreshCw className="animate-spin" size={24} /> : <Activity size={24} />}
                {isAnalyzing ? 'Analyzing Neural Core...' : 'Execute Verification'}
              </button>
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-10 bg-gray-50 dark:bg-white/5 rounded-[60px] border border-gray-100 dark:border-white/10">
              <div className="flex items-start gap-10 mb-10">
                <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center text-white shadow-2xl ${result.isGenuine ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {result.isGenuine ? <ShieldCheck size={64} /> : <ShieldAlert size={64} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${result.isGenuine ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {result.isGenuine ? 'Authentic' : 'Counterfeit'}
                    </span>
                    <span className="text-lg font-bold text-gray-400">Confidence: {result.confidence}%</span>
                  </div>
                  <h2 className="text-5xl font-black tracking-tight">{result.detectedProduct}</h2>
                  <div className="flex flex-wrap gap-4 mt-4">
                    {result.barcode && (
                      <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 inline-flex items-center gap-3">
                        <Maximize size={20} className="text-blue-500" />
                        <span className="font-mono font-bold text-gray-600 dark:text-gray-300">QR/Barcode: {result.barcode}</span>
                      </div>
                    )}
                    {result.manufactureDate && (
                      <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 inline-flex items-center gap-3">
                        <Activity size={20} className="text-emerald-500" />
                        <span className="font-bold text-gray-600 dark:text-gray-300">MFG Date: {result.manufactureDate}</span>
                      </div>
                    )}
                    {result.manufacturePlace && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 inline-flex items-center gap-3 shadow-[0_0_15px_rgba(59,130,246,0.15)] animate-pulse-subtle">
                        <Target size={20} className="text-blue-600 dark:text-blue-400" />
                        <span className="font-black text-blue-700 dark:text-blue-300">MFG Place: {result.manufacturePlace}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-white/5 rounded-[40px] border border-gray-100 dark:border-white/10 mb-10">
                <h4 className="status-label mb-4">AI Analysis Reasoning</h4>
                <p className="text-xl text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic">"{result.reasoning}"</p>
              </div>

              {result.productDescription && (
                <div className="p-8 bg-black text-white rounded-[40px] shadow-xl mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <Tag size={24} className="text-blue-500" />
                    <h3 className="text-2xl font-black">Specimen Intel</h3>
                  </div>
                  <p className="text-white/80 font-medium leading-relaxed mb-6">{result.productDescription}</p>
                  
                  {result.additionalInfo && Object.keys(result.additionalInfo).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                      {Object.entries(result.additionalInfo).map(([key, value], i) => (
                        <div key={i}>
                          <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">{key}</p>
                          <p className="font-bold">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.estimatedRating && (
                <div className="p-8 bg-gray-50 dark:bg-black/40 rounded-[40px] border border-gray-100 dark:border-white/10 mb-10">
                  <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black mb-2 flex items-center gap-2">Ratings & Sentiment</h3>
                      <p className="text-gray-500 font-medium">Market perception of this product variation</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/10">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center rounded-2xl">
                        <Star size={32} className="fill-current" />
                      </div>
                      <div>
                        <p className="text-4xl font-black text-amber-500">{result.estimatedRating.toFixed(1)}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#929292]">
                          Based on {result.reviewsCount}+ reviews
                        </p>
                      </div>
                    </div>
                  </div>

                  {result.topReviews && result.topReviews.length > 0 && (
                    <div className="space-y-4">
                      {result.topReviews.map((review: string, i: number) => (
                        <div key={i} className="p-4 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 italic text-gray-600 dark:text-gray-400">
                          "{review}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="status-label">Anomalies Detected</h4>
                  <div className="space-y-3">
                    {result.anomalies.map((a, i) => (
                      <div key={i} className="flex items-center gap-4 p-5 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 text-lg font-bold text-gray-600 dark:text-gray-300">
                        <div className="w-3 h-3 rounded-full bg-rose-500" />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="status-label">Verification Protocols</h4>
                  <div className="space-y-3">
                    {result.tips.map((t, i) => (
                      <div key={i} className="flex items-center gap-4 p-5 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 text-lg font-bold text-gray-600 dark:text-gray-300">
                        <ChevronRight size={20} className="text-blue-500" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setResult(null); setImage(null); }}
                className="mt-12 w-full py-6 border-4 border-gray-200 dark:border-white/10 text-gray-400 rounded-[32px] font-black text-xl uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                Clear Analysis
              </button>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-10">
          <div className="p-10 bg-black text-white rounded-[60px] shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Scanner Tips</h3>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold">1</div>
                <p className="text-white/70 text-sm font-medium">Ensure the product logo is clearly visible and in focus.</p>
              </li>
              <li className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold">2</div>
                <p className="text-white/70 text-sm font-medium">Capture any QR codes or barcodes on the packaging for deep verification.</p>
              </li>
              <li className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold">3</div>
                <p className="text-white/70 text-sm font-medium">Include the price tag if possible to detect market anomalies.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MarketplaceView = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const trustedPlatforms = [
    {
      name: 'Amazon',
      url: 'https://www.amazon.com',
      searchUrl: 'https://www.amazon.com/s?k=',
      description: 'The world\'s largest online retailer. Look for "Sold by Amazon" or official brand stores for maximum safety.',
      trustScore: 95,
      icon: 'https://www.vectorlogo.zone/logos/amazon/amazon-icon.svg'
    },
    {
      name: 'Flipkart',
      url: 'https://www.flipkart.com',
      searchUrl: 'https://www.flipkart.com/search?q=',
      description: 'India\'s leading e-commerce marketplace. Use "Flipkart Assured" for verified products and faster delivery.',
      trustScore: 90,
      icon: 'https://www.vectorlogo.zone/logos/flipkart/flipkart-icon.svg'
    },
    {
      name: 'Myntra',
      url: 'https://www.myntra.com',
      searchUrl: 'https://www.myntra.com/',
      description: 'Premier fashion destination. Known for authentic lifestyle and apparel brands with strict quality checks.',
      trustScore: 94,
      icon: 'https://www.vectorlogo.zone/logos/myntra/myntra-icon.svg'
    },
    {
      name: 'Ajio',
      url: 'https://www.ajio.com',
      searchUrl: 'https://www.ajio.com/search/?text=',
      description: 'Reliance-owned fashion platform. Offers a curated collection of international and local premium brands.',
      trustScore: 92,
      icon: 'https://www.vectorlogo.zone/logos/ajio/ajio-icon.svg'
    },
    {
      name: 'eBay',
      url: 'https://www.ebay.com',
      searchUrl: 'https://www.ebay.com/sch/i.html?_nkw=',
      description: 'A global marketplace. Check seller ratings and use eBay Money Back Guarantee for protection.',
      trustScore: 88,
      icon: 'https://www.vectorlogo.zone/logos/ebay/ebay-icon.svg'
    },
    {
      name: 'Walmart',
      url: 'https://www.walmart.com',
      searchUrl: 'https://www.walmart.com/search?q=',
      description: 'Trusted retail giant. Their online marketplace also features third-party sellers; verify before buying.',
      trustScore: 92,
      icon: 'https://www.vectorlogo.zone/logos/walmart/walmart-icon.svg'
    },
    {
      name: 'Best Buy',
      url: 'https://www.bestbuy.com',
      searchUrl: 'https://www.bestbuy.com/site/searchpage.jsp?st=',
      description: 'The go-to for electronics. Highly reliable for genuine tech and official manufacturer warranties.',
      trustScore: 98,
      icon: 'https://www.vectorlogo.zone/logos/bestbuy/bestbuy-icon.svg'
    },
    {
      name: 'Reliance Digital',
      url: 'https://www.reliancedigital.in',
      searchUrl: 'https://www.reliancedigital.in/search?q=',
      description: 'India\'s largest electronics retailer. Guaranteed authentic products with official service support.',
      trustScore: 96,
      icon: 'https://www.vectorlogo.zone/logos/reliance/reliance-icon.svg'
    }
  ];

  const fraudApps = [
    {
      name: 'CheapDeals Global',
      risk: 'Critical',
      description: 'Known for "Super Clone" electronics and non-delivery of high-value items. High phishing risk.',
      warning: 'Avoid sharing payment details or personal info.',
      color: 'text-rose-500'
    },
    {
      name: 'LuxuryOutlet-Direct',
      risk: 'High',
      description: 'Uses stolen brand imagery to sell low-quality replicas. No valid return policy or contact info.',
      warning: 'Prices are 90% below market value - clear red flag.',
      color: 'text-red-600'
    },
    {
      name: 'FreeGadget Hub',
      risk: 'High',
      description: 'Promotes "free" items where you only pay shipping. Shipping fees are inflated and items never arrive.',
      warning: 'Common data harvesting scheme.',
      color: 'text-orange-500'
    }
  ];

  const filteredTrusted = trustedPlatforms.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFraud = fraudApps.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isProductSearch = searchQuery.length > 0 && filteredTrusted.length === 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-4">Marketplace</h1>
          <p className="text-[#929292] font-medium text-lg">Trusted Platforms & Fraud Detection</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products or platforms..."
            className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-white/5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white border border-gray-100 dark:border-white/10"
          />
        </div>
      </div>

      {searchQuery && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-[40px]"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
              <ShoppingCart size={20} />
            </div>
            <h3 className="text-xl font-black">Search for "<span className="text-blue-500">{searchQuery}</span>" on:</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {trustedPlatforms.map((platform, i) => (
              <a
                key={i}
                href={`${platform.searchUrl}${encodeURIComponent(searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/20 transition-all group"
              >
                <img src={platform.icon} className="w-5 h-5 object-contain" alt="" referrerPolicy="no-referrer" />
                <span className="text-sm font-bold">{platform.name}</span>
                <ExternalLink size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white" />
              </a>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Trusted Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-emerald-500" size={20} />
            <h2 className="text-xl font-black uppercase tracking-widest">Verified Channels</h2>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-6">
            {(searchQuery ? filteredTrusted : trustedPlatforms).length > 0 ? (searchQuery ? filteredTrusted : trustedPlatforms).map((platform, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-gray-50 dark:bg-white/5 rounded-[40px] border border-gray-100 dark:border-white/10 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl p-3 flex items-center justify-center border border-gray-100 dark:border-white/10">
                      <img src={platform.icon} alt={platform.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#929292] mb-1">Trust</div>
                      <div className="text-xl font-black text-emerald-500">{platform.trustScore}%</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black mb-2">{platform.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-3">
                      {platform.description}
                    </p>
                  </div>
                </div>

                <a 
                  href={platform.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-6 py-3 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  Visit {platform.name}
                  <ExternalLink size={12} />
                </a>
              </motion.div>
            )) : (
              <div className="col-span-2 p-12 text-center bg-gray-50 dark:bg-white/5 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
                <p className="text-gray-400 font-medium">No verified platforms match your search.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fraud Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-rose-500" size={20} />
            <h2 className="text-xl font-black uppercase tracking-widest">Risk Alerts</h2>
          </div>

          <div className="space-y-6">
            {filteredFraud.length > 0 ? filteredFraud.map((app, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-rose-50/50 dark:bg-rose-500/5 rounded-[32px] border border-rose-100 dark:border-rose-500/20"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-black">{app.name}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-white dark:bg-black/20 ${app.color}`}>
                    {app.risk}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {app.description}
                </p>
                <div className="p-3 bg-rose-500/10 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-rose-500 shrink-0" size={14} />
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 leading-tight">
                    {app.warning}
                  </p>
                </div>
              </motion.div>
            )) : (
              <div className="p-12 text-center bg-gray-50 dark:bg-white/5 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
                <p className="text-gray-400 font-medium">No high-risk apps found for this query.</p>
              </div>
            )}
          </div>

          <div className="p-8 bg-black text-white rounded-[40px] relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-lg font-black mb-2">Stay Vigilant</h4>
              <p className="text-xs text-white/60 font-medium leading-relaxed">
                Fraudulent apps often change names. If you encounter a suspicious platform, report it to our neural network for analysis.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-[60px] -mr-16 -mt-16" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RiskMapView = () => {
  const hotspots = [
    { 
      platform: 'Social Media Marketplaces', 
      risk: 'High', 
      description: 'Unverified sellers on platforms like Facebook Marketplace and Instagram often sell high-quality clones.',
      commonItems: ['Sneakers', 'Luxury Bags', 'Electronics'],
      color: 'bg-rose-500'
    },
    { 
      platform: 'Unregulated Third-Party Sites', 
      risk: 'Critical', 
      description: 'Websites with "too good to be true" prices and no clear return policy are primary sources for fakes.',
      commonItems: ['Designer Clothing', 'Watches', 'Cosmetics'],
      color: 'bg-red-600'
    },
    { 
      platform: 'Discount Electronics Hubs', 
      risk: 'High', 
      description: 'Refurbished or "open box" electronics from non-authorized dealers often contain non-genuine parts.',
      commonItems: ['Smartphones', 'Headphones', 'Chargers'],
      color: 'bg-orange-500'
    },
    { 
      platform: 'Peer-to-Peer Apps', 
      risk: 'Medium', 
      description: 'While many are legitimate, the lack of physical inspection makes these apps vulnerable to counterfeiters.',
      commonItems: ['Collectibles', 'Trading Cards', 'Limited Editions'],
      color: 'bg-amber-500'
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <div>
        <h1 className="text-5xl font-black tracking-tight mb-4">Risk Map</h1>
        <p className="text-[#929292] font-medium text-lg">Global Counterfeit Hotspots & Vulnerable Platforms</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {hotspots.map((spot, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className="p-8 bg-gray-50 dark:bg-white/5 rounded-[40px] border border-gray-100 dark:border-white/10 space-y-6"
          >
            <div className="flex justify-between items-start">
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${spot.color}`}>
                {spot.risk} Risk
              </div>
              <AlertCircle className="text-gray-300" size={24} />
            </div>
            
            <div>
              <h3 className="text-2xl font-black mb-2">{spot.platform}</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                {spot.description}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-white/10">
              <h4 className="status-label mb-3">Commonly Targeted Items</h4>
              <div className="flex flex-wrap gap-2">
                {spot.commonItems.map((item, j) => (
                  <span key={j} className="px-3 py-1 bg-white dark:bg-white/10 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/10">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-10 bg-black text-white rounded-[60px] relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-3xl font-black mb-4">Global Trend Analysis</h3>
          <p className="text-white/60 max-w-2xl font-medium leading-relaxed">
            Our neural network tracks emerging patterns in counterfeit distribution. Currently, we see a 40% increase in "Super Clones" entering the market through direct-to-consumer social ads. Always verify before purchasing from non-authorized retailers.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/20 blur-[80px] -ml-24 -mb-24" />
      </div>
    </motion.div>
  );
};

const ExpensesView = ({ history }: { history: any[] }) => {
  const chartData = history.length > 0 
    ? history.slice(0, 8).map(item => ({
        name: item.productName.split(' ')[0],
        fullName: item.productName,
        price: parseFloat(item.estimatedPrice?.replace(/[^0-9.]/g, '') || '0'),
        displayPrice: item.estimatedPrice || 'N/A'
      })).reverse()
    : [
        { name: 'N/A', fullName: 'No Data', price: 0, displayPrice: '₹0' },
        { name: 'N/A', fullName: 'No Data', price: 0, displayPrice: '₹0' },
        { name: 'N/A', fullName: 'No Data', price: 0, displayPrice: '₹0' },
        { name: 'N/A', fullName: 'No Data', price: 0, displayPrice: '₹0' },
      ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{payload[0].payload.fullName}</p>
          <p className="text-xl font-black text-blue-500">{payload[0].payload.displayPrice}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-4">Expenses</h1>
          <p className="text-[#929292] font-medium text-lg">Product Price Analysis & History</p>
        </div>
      </div>

      <div className="h-96 w-full mb-16 bg-gray-50 dark:bg-white/5 p-8 rounded-[40px] border border-gray-100 dark:border-white/10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 40, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" opacity={0.1} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 10 }}
              content={<CustomTooltip />}
            />
            <Bar dataKey="price" fill="#3B82F6" radius={[12, 12, 0, 0]} barSize={50}>
              <LabelList 
                dataKey="displayPrice" 
                position="top" 
                offset={15}
                style={{ fill: '#3B82F6', fontSize: 12, fontWeight: 900, fontFamily: 'Inter' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-12">
        <section>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black">History</h3>
            <MoreHorizontal className="text-gray-300 cursor-pointer" />
          </div>

          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="transaction-card">
                <div className="flex items-center gap-6">
                  <div className={`icon-circle ${item.isGenuine ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {item.isGenuine ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">{item.productName}</h4>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.brandName || 'Unknown Brand'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black">{item.estimatedPrice || 'N/A'}</p>
                  <p className={`text-xs font-bold uppercase tracking-widest ${item.isGenuine ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.isGenuine ? 'Genuine' : 'Fake'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
};

const AccountsView = ({ user }: { user: FirebaseUser }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-4">Accounts</h1>
          <p className="text-[#929292] font-medium text-lg">Manage your profile and security</p>
        </div>
      </div>

      <div className="max-w-2xl bg-gray-50 dark:bg-white/5 rounded-[40px] p-10 border border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-8 mb-10">
          <img 
            src={user.photoURL || "https://picsum.photos/seed/samantha/200"} 
            alt="Profile" 
            className="w-32 h-32 rounded-[40px] object-cover shadow-xl"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-3xl font-black">{user.displayName}</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{user.email}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest">
              Verified Account
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="status-label mb-1">Account ID</p>
              <p className="font-mono font-bold text-gray-600 dark:text-gray-400">{user.uid}</p>
            </div>
            <button className="p-3 bg-gray-50 dark:bg-white/10 rounded-2xl text-gray-400 hover:text-black dark:hover:text-white transition-all">
              <RefreshCw size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
              <p className="status-label mb-1">Last Login</p>
              <p className="font-bold text-gray-800 dark:text-gray-200">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
              <p className="status-label mb-1">Security Status</p>
              <p className="font-bold text-emerald-500">High</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SettingsView = ({ user, darkMode, setDarkMode }: { user: FirebaseUser, darkMode: boolean, setDarkMode: (v: boolean) => void }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-4">Settings</h1>
          <p className="text-[#929292] font-medium text-lg">System preferences & configurations</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-10 bg-gray-50 dark:bg-white/5 rounded-[40px] border border-gray-100 dark:border-white/10 space-y-8">
          <h3 className="text-2xl font-black">General Settings</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
              <div>
                <p className="font-bold">Dark Mode</p>
                <p className="text-xs text-gray-400">Enable high-contrast interface</p>
              </div>
              <div 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${darkMode ? 'bg-blue-500' : 'bg-gray-200'}`}
              >
                <motion.div 
                  animate={{ x: darkMode ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
              <div>
                <p className="font-bold">Notifications</p>
                <p className="text-xs text-gray-400">Push alerts for scan results</p>
              </div>
              <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-gray-50 dark:bg-white/5 rounded-[40px] border border-gray-100 dark:border-white/10 space-y-8">
          <h3 className="text-2xl font-black">Neural Core</h3>
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
              <p className="status-label mb-2">Analysis Precision</p>
              <div className="flex items-center gap-4">
                <input type="range" className="flex-1 accent-blue-500" defaultValue={95} />
                <span className="font-black text-blue-500">95%</span>
              </div>
            </div>
            <div className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
              <p className="status-label mb-2">Model Version</p>
              <p className="font-bold text-gray-800">Gemini 3.1 Pro (Latest)</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const LogoutView = ({ logout }: { logout: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
        <LogOut size={48} />
      </div>
      <h2 className="text-4xl font-black tracking-tight mb-4">Ready to Leave?</h2>
      <p className="text-gray-500 font-medium mb-12 max-w-md">
        Your verification history and neural analysis data will be safely stored in your VeriCheck AI account.
      </p>
      <div className="flex gap-4">
        <button 
          onClick={logout}
          className="px-12 py-5 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-lg hover:bg-rose-600 transition-all shadow-lg"
        >
          Logout Now
        </button>
      </div>
    </div>
  );
};
