import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  signOut,
  setPersistence, // Importante
  browserLocalPersistence // Importante
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { 
  Plus, Film, Tv, Trash2, CheckCircle, Star, Calendar, 
  Search, Filter, MonitorPlay, X, Edit2, LogOut, 
  Users, Cloud, Loader2, Settings, AlertTriangle, Hash,
  Download, ArrowUp, ArrowDown, FileText, UserCircle
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE (EDITAR AQUÍ) ---
const firebaseConfig = {
  apiKey: "AIzaSyD4Zs7YBFwLsPzto7S3UqI7PR9dLreRkK8",
  authDomain: "que-ver-4f4b6.firebaseapp.com",
  projectId: "que-ver-4f4b6",
  storageBucket: "que-ver-4f4b6.firebasestorage.app",
  messagingSenderId: "70647074088",
  appId: "1:70647074088:web:77fbdeecae7ddc557a141d"
};

const isConfigured = firebaseConfig.apiKey !== "TU_API_KEY_PEGA_AQUI";

let app, auth, db;
if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Error inicializando Firebase:", e);
  }
}

// --- HOOKS Y HELPERS ---

function useLongPress(callback = () => {}, ms = 3000) { 
  const [startLongPress, setStartLongPress] = useState(false);
  const timerId = useRef();

  const start = React.useCallback(() => {
    setStartLongPress(true);
    timerId.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      callback();
    }, ms);
  }, [callback, ms]);

  const stop = React.useCallback(() => {
    setStartLongPress(false);
    clearTimeout(timerId.current);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}

const getPlatformColor = (p) => {
  const map = {
    'Netflix': 'red', 'Amazon Prime': 'blue', 'Disney+': 'blue', 
    'Crunchyroll': 'yellow', 'Apple TV': 'gray', 'Paramount+': 'blue'
  };
  return map[p] || 'violet';
};

// --- COMPONENTES UI ---

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "rounded-xl font-bold transition-all duration-200 flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  const variants = {
    primary: "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/20",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
    ghost: "text-gray-400 hover:text-white hover:bg-white/5",
    outline: "border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white",
    install: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/30 hover:brightness-110",
    action: "bg-gray-700 hover:bg-gray-600 text-white shadow-lg border border-gray-600",
    google: "bg-white text-gray-900 hover:bg-gray-100 border border-gray-200 shadow-md"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    gray: 'bg-gray-700/50 text-gray-300 border-gray-600',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${colors[color] || colors.gray} uppercase tracking-wider`}>
      {children}
    </span>
  );
};

// --- SUB-COMPONENTE TARJETA ---
const MediaCard = ({ item, activeTab, reorderModeId, handlers, searchQuery }) => {
  const longPressProps = useLongPress(() => handlers.onLongPress(item.id), 3000);
  const isInteractable = !reorderModeId && !searchQuery;
  const interactionProps = isInteractable ? longPressProps : {};

  return (
    <div 
      {...interactionProps}
      className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-violet-900/10 hover:border-violet-500/30 transition-all duration-300 flex flex-col relative select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {reorderModeId === item.id && (
        <div className="absolute inset-0 z-50 bg-gray-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
          <p className="text-violet-300 font-bold text-lg mb-2">Mover</p>
          <div className="flex gap-4">
            <Button variant="action" onClick={() => handlers.onMove(item.id, -1)} className="!p-4 rounded-full"><ArrowUp size={32} /></Button>
            <Button variant="action" onClick={() => handlers.onMove(item.id, 1)} className="!p-4 rounded-full"><ArrowDown size={32} /></Button>
          </div>
          <button onClick={handlers.onCancelReorder} className="mt-4 text-gray-400 hover:text-white flex items-center gap-2 text-sm"><X size={16}/> Terminar</button>
        </div>
      )}

      <div className="p-5 flex-1 relative">
        {activeTab === 'watchlist' && (
          <button onClick={() => handlers.onEdit(item)} className="absolute top-4 right-4 text-gray-600 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all" title="Editar"><Edit2 size={20} /></button>
        )}
        <div className="flex justify-between items-start mb-3 pr-8">
          <Badge color={getPlatformColor(item.platform)}>{item.platform}</Badge>
          {item.type === 'movie' ? <Film size={20} className="text-gray-500" /> : <Tv size={20} className="text-gray-500" />}
        </div>
        <h3 className="text-xl font-bold text-gray-100 leading-tight mb-2 group-hover:text-violet-400 transition-colors">{item.title}</h3>
        {activeTab === 'history' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded"><Star size={16} fill="currentColor" /><span className="text-base">{item.rating}</span></div>
              <div className="flex items-center gap-1.5 text-gray-500"><Calendar size={16} /><span>{new Date(item.watchedAt || '').toLocaleDateString()}</span></div>
            </div>
            {item.review && <div className="relative pl-3 border-l-2 border-gray-700 pt-1"><p className="text-sm text-gray-400 italic line-clamp-3 leading-relaxed">"{item.review}"</p></div>}
          </div>
        )}
      </div>
      <div className="px-5 py-4 bg-gray-950/30 border-t border-gray-800 flex items-center justify-between">
        {activeTab === 'watchlist' ? (
          <>
            <button onClick={() => handlers.onDelete(item.id)} className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg" title="Eliminar"><Trash2 size={20} /></button>
            <Button variant="primary" onClick={() => handlers.onRate(item)} className="!py-2 !px-4 !text-sm shadow-md"><CheckCircle size={16} /> Ya la vi</Button>
          </>
        ) : (
          <>
            <button onClick={() => handlers.onDelete(item.id)} className="text-gray-500 hover:text-red-400 transition-colors text-sm flex items-center gap-1.5 hover:bg-red-500/10 px-2 py-1 rounded"><Trash2 size={16} /> Borrar</button>
            <div className="text-xs text-gray-600 font-mono flex items-center gap-1"><Cloud size={12}/> Synced</div>
          </>
        )}
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); });
    if (!document.getElementById('tailwind-script')) {
      const script = document.createElement('script');
      script.id = 'tailwind-script';
      script.src = "https://cdn.tailwindcss.com";
      script.onload = () => { window.tailwind.config = { theme: { extend: { colors: { gray: { 950: '#030712' } } } } }; };
      document.head.appendChild(script);
    }
    if (!document.getElementById('google-fonts')) {
      const link = document.createElement('link');
      link.id = 'google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
      const style = document.createElement('style');
      style.innerHTML = `body { font-family: 'Inter', sans-serif; background-color: #030712; color: white; -webkit-tap-highlight-color: transparent; }`;
      document.head.appendChild(style);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // Estados
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // ESTADO DE CARGA PARA AUTH
  const [authError, setAuthError] = useState(null);
  const [listCode, setListCode] = useState(() => localStorage.getItem('cinelist_code') || '');
  const [items, setItems] = useState([]);
  const [platforms, setPlatforms] = useState(['Netflix', 'Amazon Prime', 'Apple TV', 'Disney+', 'Crunchyroll', 'Paramount+']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados UI
  const [activeTab, setActiveTab] = useState('watchlist'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToRate, setItemToRate] = useState(null);
  const [reorderModeId, setReorderModeId] = useState(null);

  // Filtros
  const [filterType, setFilterType] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortHistoryBy, setSortHistoryBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados Exportación
  const [exportFilters, setExportFilters] = useState({ type: 'all', period: 'all' });

  // Formularios
  const [newItem, setNewItem] = useState({ title: '', type: 'series', platform: 'Netflix' });
  const [ratingData, setRatingData] = useState({ rating: 5, date: new Date().toISOString().split('T')[0], review: '' });
  const [newPlatformName, setNewPlatformName] = useState('');
  const [inputCode, setInputCode] = useState('');

  // AUTH: Google
  useEffect(() => {
    if (!isConfigured) {
        setIsAuthLoading(false);
        return;
    }
    
    // VERIFICAR REDIRECT (Para errores de autenticación)
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log("Redirect success user:", result.user);
          setUser(result.user);
        }
      })
      .catch((error) => {
        console.error("Redirect Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
           setAuthError("DOMINIO NO AUTORIZADO: Agrega tu URL de Vercel en Firebase Console > Authentication > Settings.");
        } else {
           setAuthError(error.message);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setAuthError(null);
      setIsAuthLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      // 1. Forzar persistencia LOCAL
      await setPersistence(auth, browserLocalPersistence);
      // 2. Redirigir
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Error Login:", error);
      setAuthError("No se pudo iniciar sesión. Verifica 'Dominios Autorizados' en Firebase.");
    }
  };

  const handleSignOut = () => {
    if (window.confirm("¿Cerrar sesión de Google?")) {
      signOut(auth);
      setListCode('');
      localStorage.removeItem('cinelist_code');
    }
  };

  // Carga de datos
  useEffect(() => {
    if (!isConfigured || !user || !listCode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'cinelist'), where('listId', '==', listCode));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordenar por campo 'order' o timestamp
      fetchedItems.sort((a, b) => {
        const orderA = a.order ?? a.createdAt?.seconds ?? 0;
        const orderB = b.order ?? b.createdAt?.seconds ?? 0;
        return orderB - orderA; 
      });

      setItems(fetchedItems);
      
      const usedPlatforms = new Set(['Netflix', 'Amazon Prime', 'Apple TV', 'Disney+', 'Crunchyroll', 'Paramount+']);
      fetchedItems.forEach(i => { if(i.platform) usedPlatforms.add(i.platform); });
      setPlatforms(Array.from(usedPlatforms));
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching:", error);
      if(error.code === 'permission-denied') setAuthError("Permiso denegado. Revisa las reglas de Firestore.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, listCode]);

  // Funciones de manejo (Move, LongPress, Add, etc.)
  const moveItem = async (itemId, direction) => {
    const currentIndex = items.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;
    
    const targetIndex = currentIndex + direction; 
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const currentItem = items[currentIndex];
    const targetItem = items[targetIndex];

    const currentOrderVal = currentItem.order ?? currentItem.createdAt?.seconds ?? Date.now();
    const targetOrderVal = targetItem.order ?? targetItem.createdAt?.seconds ?? Date.now();

    try {
      const batch = writeBatch(db);
      const currentRef = doc(db, 'cinelist', currentItem.id);
      const targetRef = doc(db, 'cinelist', targetItem.id);

      let newCurrentOrder = targetOrderVal;
      let newTargetOrder = currentOrderVal;
      
      if (newCurrentOrder === newTargetOrder) {
         newCurrentOrder += (direction === -1 ? 1 : -1);
      }

      batch.update(currentRef, { order: newCurrentOrder });
      batch.update(targetRef, { order: newTargetOrder });

      await batch.commit();
    } catch (e) {
      alert("Error al mover: " + e.message);
    }
  };

  const handleLongPress = (id) => {
    if (activeTab === 'watchlist' && filterType === 'all' && filterPlatform === 'all' && !searchQuery) {
      setReorderModeId(id);
    } else if (activeTab === 'watchlist') {
      alert("Elimina los filtros para reordenar.");
    }
  };

  // --- LÓGICA DE EXPORTACIÓN ---
  const getAvailableMonths = () => {
    const months = new Set();
    items.forEach(item => { if (item.status === 'watched' && item.watchedAt) months.add(item.watchedAt.substring(0, 7)); });
    return Array.from(months).sort().reverse(); 
  };

  const handleExport = () => {
    const { type, period } = exportFilters;
    let exportItems = items.filter(i => i.status === 'watched');
    if (type !== 'all') exportItems = exportItems.filter(i => i.type === type);
    let periodLabel = "LISTA ENTERA";
    if (period !== 'all') {
      exportItems = exportItems.filter(i => i.watchedAt && i.watchedAt.startsWith(period));
      const [year, month] = period.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      periodLabel = `${monthName} ${year}`;
    }
    if (exportItems.length === 0) return alert("No hay items para exportar con estos filtros.");
    let content = `--- ${periodLabel} ---\n`;
    content += `CineList by ED - Total: ${exportItems.length}\n\n`;
    exportItems.forEach(item => { content += `${item.title} - ${item.rating}/10\n`; });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `CineList_${period === 'all' ? 'Completa' : period}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  // --- OTRAS ACCIONES ---

  const addItemToCloud = async (e) => {
    e.preventDefault(); if (!newItem.title.trim()) return; setSaving(true);
    try {
      const collectionRef = collection(db, 'cinelist');
      const maxOrder = items.length > 0 ? (items[0].order ?? items[0].createdAt?.seconds ?? Date.now()) : Date.now();
      if (isEditing && editingId) { await updateDoc(doc(db, 'cinelist', editingId), { title: newItem.title, type: newItem.type, platform: newItem.platform }); } 
      else { await addDoc(collectionRef, { listId: listCode, title: newItem.title, type: newItem.type, platform: newItem.platform, status: 'pending', addedAt: new Date().toISOString(), createdAt: serverTimestamp(), order: maxOrder + 1000, watchedAt: null, rating: null, review: null }); }
      setIsModalOpen(false); setNewItem({ title: '', type: 'series', platform: platforms[0] }); setIsEditing(false); setEditingId(null);
    } catch (error) { alert(`Error: ${error.message}`); } finally { setSaving(false); }
  };

  const confirmRatingCloud = async (e) => {
    e.preventDefault(); if (!itemToRate) return; setSaving(true);
    try { await updateDoc(doc(db, 'cinelist', itemToRate.id), { status: 'watched', rating: Number(ratingData.rating), watchedAt: ratingData.date, review: ratingData.review }); setIsRateModalOpen(false); setItemToRate(null); } 
    catch (error) { alert(`Error: ${error.message}`); } finally { setSaving(false); }
  };

  const deleteItemCloud = async (id) => { if (window.confirm('¿Eliminar?')) { try { await deleteDoc(doc(db, 'cinelist', id)); } catch (e) { alert(e.message); } } };
  const handleJoinList = (e) => { e.preventDefault(); if (inputCode.trim().length < 3) return alert("Mínimo 3 caracteres"); const code = inputCode.trim().toUpperCase(); localStorage.setItem('cinelist_code', code); setListCode(code); };
  const handleLogoutCode = () => { if (window.confirm("¿Salir de esta lista?")) { localStorage.removeItem('cinelist_code'); setListCode(''); setItems([]); } };
  
  const getFilteredItems = () => {
    let filtered = items.filter(i => {
      const statusMatch = activeTab === 'watchlist' ? i.status === 'pending' : i.status === 'watched';
      const typeMatch = filterType === 'all' ? true : i.type === filterType;
      const platformMatch = filterPlatform === 'all' ? true : i.platform === filterPlatform;
      const searchMatch = i.title.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatch && typeMatch && platformMatch && searchMatch;
    });
    if (activeTab === 'history') {
      filtered.sort((a, b) => sortHistoryBy === 'rating' ? (b.rating || 0) - (a.rating || 0) : new Date(b.watchedAt || '').getTime() - new Date(a.watchedAt || '').getTime());
    }
    return filtered;
  };

  const filteredItems = getFilteredItems();

  // --- VISTAS ---
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center text-gray-100 font-sans">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
          <h1 className="text-2xl font-bold mb-4">Configuración Pendiente</h1>
          <p className="text-gray-400 mb-6">Recuerda pegar tus claves de Firebase en el archivo <code>src/App.jsx</code>.</p>
        </div>
      </div>
    );
  }

  // PANTALLA DE CARGA (Para evitar el rebote del login)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-violet-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-3 rounded-xl w-fit mx-auto mb-6"><Users size={32} className="text-white" /></div>
          <h1 className="text-2xl font-bold text-white mb-2">CineList by ED</h1>
          <p className="text-gray-400 mb-8">Inicia sesión para guardar tus listas de forma segura y permanente.</p>
          
          <Button variant="google" onClick={handleGoogleLogin} className="w-full py-3 px-6 text-lg justify-center">
            {/* SVG Google */}
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Entrar con Google
          </Button>

          {authError && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-pulse"><p className="font-bold flex items-center justify-center gap-2"><AlertTriangle size={16}/> Error:</p><p>{authError}</p></div>}
        </div>
      </div>
    );
  }

  // SI HAY USUARIO PERO NO CÓDIGO
  if (!listCode) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl relative">
          
          <button onClick={handleSignOut} className="absolute top-4 right-4 text-gray-500 hover:text-white" title="Cerrar sesión">
            <LogOut size={20}/>
          </button>

          <div className="flex flex-col items-center mb-6">
             {user.photoURL ? <img src={user.photoURL} alt="User" className="w-16 h-16 rounded-full border-2 border-violet-500 mb-3" /> : <UserCircle size={64} className="text-violet-500 mb-3" />}
             <h2 className="text-xl font-bold text-white">Hola, {user.displayName?.split(' ')[0]}</h2>
             <p className="text-gray-400 text-sm">{user.email}</p>
          </div>

          <p className="text-gray-300 mb-6">Ingresa el código de la lista que quieres ver o crea una nueva.</p>
          <form onSubmit={handleJoinList} className="space-y-4">
            <div><input type="text" placeholder="Ej: ERNESTO-CASA" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest uppercase focus:ring-2 focus:ring-violet-500 outline-none placeholder-gray-700" value={inputCode} onChange={e => setInputCode(e.target.value)} /></div>
            <Button type="submit" className="w-full py-3 px-6 text-lg">Entrar a la Lista</Button>
          </form>
          {deferredPrompt && <div className="mt-6 pt-6 border-t border-gray-800"><Button variant="install" onClick={handleInstallClick} className="w-full"><Download size={18} /> Instalar App</Button></div>}
        </div>
      </div>
    );
  }

  // APP PRINCIPAL (Main)
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-violet-500/30 flex flex-col">
      {authError && <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2"><AlertTriangle size={18} />{authError}</div>}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="bg-violet-600/20 p-2 rounded-xl"><Cloud size={24} className="text-violet-400" /></div>
               <div className="flex flex-col"><h1 className="text-xl font-bold text-white leading-none">CineList by ED</h1><div className="flex items-center gap-1 text-violet-400 text-sm mt-1 bg-violet-900/10 px-2 py-0.5 rounded-md font-mono tracking-wider border border-violet-500/20"><Hash size={12} />{listCode}</div></div>
             </div>
             <div className="flex items-center gap-2">
               {deferredPrompt && <Button variant="install" onClick={handleInstallClick} className="!px-3 !py-2 text-xs sm:text-sm animate-pulse"><Download size={16} /> <span className="hidden sm:inline">Instalar</span></Button>}
               <Button variant="ghost" onClick={handleLogoutCode} className="text-red-400 hover:bg-red-500/10 hover:text-red-300 !px-3" title="Salir de la lista"><LogOut size={24} /></Button>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex flex-1 items-center gap-1 bg-gray-950/50 p-1.5 rounded-2xl border border-gray-800">
              <button onClick={() => setActiveTab('watchlist')} className={`flex-1 py-3 px-2 rounded-xl text-base sm:text-lg font-bold transition-all text-center ${activeTab === 'watchlist' ? 'bg-gray-800 text-white shadow-lg ring-1 ring-white/10' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}>POR VER</button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-2 rounded-xl text-base sm:text-lg font-bold transition-all text-center ${activeTab === 'history' ? 'bg-gray-800 text-white shadow-lg ring-1 ring-white/10' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}>HISTORIAL</button>
            </nav>
            <Button onClick={() => { setIsEditing(false); setEditingId(null); setNewItem({ title: '', type: 'series', platform: platforms[0] }); setIsModalOpen(true); }} className="!py-4 !px-6 !text-lg !rounded-xl shadow-violet-900/40" disabled={!!authError}><Plus size={24} /> <span className="hidden sm:inline">Agregar</span></Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filterType === 'all' ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>Todos</button>
              <button onClick={() => setFilterType('series')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filterType === 'series' ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}><Tv size={16} /> Series</button>
              <button onClick={() => setFilterType('movie')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filterType === 'movie' ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}><Film size={16} /> Películas</button>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* FILTROS DE HISTORIAL + BOTÓN EXPORTAR */}
              {activeTab === 'history' && (
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <select value={sortHistoryBy} onChange={(e) => setSortHistoryBy(e.target.value)} className="appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-violet-500 outline-none w-full md:w-auto"><option value="date">Por Fecha</option><option value="rating">Por Nota</option></select>
                    <Filter size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
                  </div>
                  <Button variant="secondary" onClick={() => setIsExportModalOpen(true)} className="!px-3 !py-2 h-full text-violet-300 border-violet-500/30 hover:bg-violet-500/10">
                    <FileText size={18} />
                  </Button>
                </div>
              )}

              <div className="relative flex-1 md:flex-none"><select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="w-full appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-violet-500 outline-none"><option value="all">Todas las plataformas</option>{platforms.map(p => <option key={p} value={p}>{p}</option>)}</select><MonitorPlay size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" /></div>
              <button onClick={() => setIsPlatformModalOpen(true)} className="text-xs text-violet-400 hover:text-violet-300 underline whitespace-nowrap">+ Plataforma</button>
            </div>
          </div>
          <div className="relative">
            <Search size={18} className="absolute inset-y-0 left-4 my-auto text-gray-500 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Buscar en ${activeTab === 'watchlist' ? 'Por Ver' : 'Historial'}...`} className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-base rounded-2xl pl-12 pr-10 py-3.5 focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder-gray-600 shadow-sm" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white"><X size={18} /></button>}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500"><Loader2 size={40} className="animate-spin mb-4 text-violet-500" /><p className="text-lg">Sincronizando...</p></div>
        ) : (
          <>
            <div className="mb-6 text-sm text-gray-500 flex gap-4 font-medium">
              <span>Mostrando <strong>{filteredItems.length}</strong> {activeTab === 'watchlist' ? 'títulos pendientes' : 'títulos vistos'}</span>
              {activeTab === 'history' && filteredItems.length > 0 && <span className="flex items-center gap-1 text-yellow-500/80"><Star size={14} /> Promedio: {(filteredItems.reduce((acc, curr) => acc + (curr.rating || 0), 0) / filteredItems.length).toFixed(1)}</span>}
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-gray-900/30 rounded-2xl border-2 border-dashed border-gray-800">
                <Film size={56} className="mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-bold text-gray-400">{searchQuery ? 'No se encontraron resultados' : 'Lista vacía'}</h3>
                <p className="text-gray-500 mt-2 mb-8 max-w-sm mx-auto text-base">{searchQuery ? 'Intenta con otro término' : 'Esta lista se podra compartir en varios dispositivos si tienen el mismo codigo.'}</p>
                {!searchQuery && <Button variant="outline" onClick={() => { setIsEditing(false); setEditingId(null); setNewItem({ title: '', type: 'series', platform: platforms[0] }); setIsModalOpen(true); }} className="!px-6 !py-3">Agregar Título</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <MediaCard 
                    key={item.id} 
                    item={item} 
                    activeTab={activeTab}
                    reorderModeId={reorderModeId}
                    searchQuery={searchQuery}
                    handlers={{
                      onLongPress: handleLongPress,
                      onMove: moveItem,
                      onCancelReorder: () => setReorderModeId(null),
                      onEdit: (i) => { setIsEditing(true); setEditingId(i.id); setNewItem({ title: i.title, type: i.type, platform: i.platform }); setIsModalOpen(true); },
                      onDelete: deleteItemCloud,
                      onRate: (i) => { setItemToRate(i); setRatingData({ rating: 8, date: new Date().toISOString().split('T')[0], review: '' }); setIsRateModalOpen(true); }
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* --- MODALES --- */}
      {isModalOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">{isEditing ? 'Editar Título' : 'Agregar a la lista compartida'}</h2><button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button></div><form onSubmit={addItemToCloud} className="space-y-4"><div><label className="block text-sm font-medium text-gray-400 mb-1">Título</label><input type="text" autoFocus className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none text-lg" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} required /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label><select className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}><option value="series">Serie</option><option value="movie">Película</option></select></div><div><label className="block text-sm font-medium text-gray-400 mb-1">Plataforma</label><select className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500" value={newItem.platform} onChange={e => setNewItem({...newItem, platform: e.target.value})}>{platforms.map(p => <option key={p} value={p}>{p}</option>)}</select></div></div><div className="pt-4 flex gap-3"><Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 !py-3">Cancelar</Button><button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 text-base">{saving ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'Actualizar' : 'Guardar')}</button></div></form></div></div>}
      {isRateModalOpen && itemToRate && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center"><h2 className="text-2xl font-bold text-white mb-1">¿Qué tal estuvo?</h2><p className="text-gray-400 text-base mb-6">Califica <span className="text-violet-400 font-bold">{itemToRate.title}</span></p><form onSubmit={confirmRatingCloud} className="space-y-6"><div className="bg-gray-950 p-5 rounded-2xl border border-gray-800"><div className="flex justify-between items-center mb-4"><label className="text-sm font-medium text-gray-300">Puntuación</label><span className="text-4xl font-black text-yellow-400">{ratingData.rating}</span></div><input type="range" min="0" max="10" step="0.5" value={ratingData.rating} onChange={e => setRatingData({...ratingData, rating: Number(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500" /><div className="flex justify-between text-xs text-gray-500 mt-2 font-medium"><span>0 (Malísima)</span><span>10 (Obra Maestra)</span></div></div><div><label className="block text-sm font-medium text-gray-400 mb-2 text-left">Tu Reseña</label><textarea className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none resize-none h-24 text-sm" placeholder="Comentarios..." value={ratingData.review} onChange={e => setRatingData({...ratingData, review: e.target.value})} /></div><div><label className="block text-sm font-medium text-gray-400 mb-2 text-left">Fecha</label><input type="date" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 outline-none" value={ratingData.date} onChange={e => setRatingData({...ratingData, date: e.target.value})} required /></div><div className="flex gap-3 pt-2"><Button variant="ghost" onClick={() => setIsRateModalOpen(false)} className="flex-1 !py-3">Cancelar</Button><button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-lg font-bold text-base shadow-lg shadow-violet-900/20">{saving ? 'Guardando...' : 'Confirmar'}</button></div></form></div></div>}
      {isPlatformModalOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6"><h3 className="text-xl font-bold text-white mb-4">Añadir Plataforma</h3><form onSubmit={(e) => { e.preventDefault(); if (newPlatformName.trim() && !platforms.includes(newPlatformName)) { setPlatforms([...platforms, newPlatformName]); setNewPlatformName(''); setIsPlatformModalOpen(false); } }}><input type="text" autoFocus placeholder="Ej: HBO Max..." className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white mb-4 focus:ring-2 focus:ring-violet-500 outline-none text-lg" value={newPlatformName} onChange={e => setNewPlatformName(e.target.value)} /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setIsPlatformModalOpen(false)}>Cancelar</Button><Button type="submit" variant="primary" disabled={!newPlatformName.trim()}>Añadir</Button></div></form></div></div>}
      {isExportModalOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={20}/> Exportar Historial</h2><button onClick={() => setIsExportModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button></div><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-400 mb-1">Qué exportar</label><select className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-violet-500" value={exportFilters.type} onChange={e => setExportFilters({...exportFilters, type: e.target.value})}><option value="all">Todo (Series y Películas)</option><option value="series">Solo Series</option><option value="movie">Solo Películas</option></select></div><div><label className="block text-sm font-medium text-gray-400 mb-1">Periodo</label><select className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-violet-500" value={exportFilters.period} onChange={e => setExportFilters({...exportFilters, period: e.target.value})}><option value="all">Toda la historia</option>{getAvailableMonths().map(monthStr => { const [year, month] = monthStr.split('-'); const date = new Date(year, month - 1); return (<option key={monthStr} value={monthStr}>{date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</option>); })}</select></div><div className="pt-4 flex gap-3"><Button variant="secondary" onClick={() => setIsExportModalOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" variant="primary" onClick={handleExport} className="flex-1"><Download size={18} /> Descargar TXT</Button></div></div></div></div>}
    </div>
  );
}