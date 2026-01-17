import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
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
  Download, ArrowUp, ArrowDown, Move
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

// --- HOOK PARA LONG PRESS (Mantener presionado) ---
function useLongPress(callback = () => {}, ms = 600) {
  const [startLongPress, setStartLongPress] = useState(false);
  const timerId = useRef();

  const start = React.useCallback(() => {
    setStartLongPress(true);
    timerId.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50); // Pequeña vibración háptica
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
    action: "bg-gray-700 hover:bg-gray-600 text-white shadow-lg border border-gray-600" // Para los botones de subir/bajar
  };
  
  const variantClass = variants[variant] || variants.primary;

  return (
    <button onClick={onClick} className={`${baseStyle} ${variantClass} ${className}`} {...props}>
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
  const selectedColor = colors[color] || colors.gray;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${selectedColor} uppercase tracking-wider`}>
      {children}
    </span>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  
  // Lógica de PWA e Inyección de Estilos
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
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

  // Estados
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [listCode, setListCode] = useState(() => localStorage.getItem('cinelist_code') || '');
  const [items, setItems] = useState([]);
  const [platforms, setPlatforms] = useState(['Netflix', 'Amazon Prime', 'Apple TV', 'Disney+', 'Crunchyroll', 'Paramount+']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de Interfaz
  const [activeTab, setActiveTab] = useState('watchlist'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToRate, setItemToRate] = useState(null);
  
  // Estado para REORDENAR (Nuevo)
  const [reorderModeId, setReorderModeId] = useState(null);

  // Filtros
  const [filterType, setFilterType] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortHistoryBy, setSortHistoryBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

  // Formularios
  const [newItem, setNewItem] = useState({ title: '', type: 'series', platform: 'Netflix' });
  const [ratingData, setRatingData] = useState({ rating: 5, date: new Date().toISOString().split('T')[0], review: '' });
  const [newPlatformName, setNewPlatformName] = useState('');
  const [inputCode, setInputCode] = useState('');

  // Auth
  useEffect(() => {
    if (!isConfigured) return;
    const initAuth = async () => {
      try {
        if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
           await signInWithCustomToken(auth, window.__initial_auth_token);
        } else {
           await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
        setAuthError(error.message);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Carga de datos con ORDENAMIENTO
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

      // Ordenar: Usamos el campo 'order' si existe, si no, 'createdAt'
      fetchedItems.sort((a, b) => {
        const orderA = a.order ?? a.createdAt?.seconds ?? 0;
        const orderB = b.order ?? b.createdAt?.seconds ?? 0;
        // Orden descendente (más nuevo/alto arriba)
        return orderB - orderA; 
      });

      setItems(fetchedItems);
      
      const usedPlatforms = new Set(['Netflix', 'Amazon Prime', 'Apple TV', 'Disney+', 'Crunchyroll', 'Paramount+']);
      fetchedItems.forEach(i => { if(i.platform) usedPlatforms.add(i.platform); });
      setPlatforms(Array.from(usedPlatforms));
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching:", error);
      if(error.code === 'permission-denied') setAuthError("Permiso denegado.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, listCode]);

  // --- LÓGICA DE REORDENAMIENTO ---
  const moveItem = async (itemId, direction) => {
    // direction: -1 (Subir, visualmente hacia arriba, índice menor en pantalla, pero mayor valor de 'order')
    // Espera, el sort es DESCENDENTE (B - A). 
    // Item arriba tiene MAYOR order. Item abajo tiene MENOR order.
    // Subir = Incrementar orden (swap con el de arriba).
    // Bajar = Decrementar orden (swap con el de abajo).

    const currentIndex = items.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;

    // Calculamos el índice destino en el array visual
    // Si direction es "up" (-1 en el array visual), queremos ir al índice 0
    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= items.length) return; // Fuera de limites

    const currentItem = items[currentIndex];
    const targetItem = items[targetIndex];

    // Valores de orden actuales (fallback a timestamp si no hay orden)
    const currentOrderVal = currentItem.order ?? currentItem.createdAt?.seconds ?? Date.now();
    const targetOrderVal = targetItem.order ?? targetItem.createdAt?.seconds ?? Date.now();

    // Si los valores son iguales (raro pero posible), forzamos una diferencia
    let newCurrentOrder = targetOrderVal;
    let newTargetOrder = currentOrderVal;

    if (newCurrentOrder === newTargetOrder) {
       newCurrentOrder = newCurrentOrder + (direction === -1 ? 1 : -1); 
    }

    try {
      const batch = writeBatch(db);
      const currentRef = doc(db, 'cinelist', currentItem.id);
      const targetRef = doc(db, 'cinelist', targetItem.id);

      batch.update(currentRef, { order: newCurrentOrder });
      batch.update(targetRef, { order: newTargetOrder });

      await batch.commit();
    } catch (e) {
      alert("Error al mover: " + e.message);
    }
  };

  const handleLongPress = (id) => {
    // Solo permitir reordenar en la lista principal y si no estamos filtrando (para evitar confusiones)
    if (activeTab === 'watchlist' && filterType === 'all' && filterPlatform === 'all' && !searchQuery) {
      setReorderModeId(id);
    } else if (activeTab === 'watchlist') {
      alert("Para reordenar, elimina los filtros de búsqueda primero.");
    }
  };

  const longPressEvents = (id) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useLongPress(() => handleLongPress(id), 600); // 600ms para activar
  };

  // --- OTRAS ACCIONES ---

  const addItemToCloud = async (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;
    if (!user) return alert("No estás conectado.");
    setSaving(true);
    try {
      const collectionRef = collection(db, 'cinelist');
      // Nuevo item obtiene el orden máximo actual + 1000 para quedar arriba
      const maxOrder = items.length > 0 ? (items[0].order ?? items[0].createdAt?.seconds ?? Date.now()) : Date.now();
      
      if (isEditing && editingId) {
        const docRef = doc(db, 'cinelist', editingId);
        await updateDoc(docRef, { title: newItem.title, type: newItem.type, platform: newItem.platform });
      } else {
        await addDoc(collectionRef, {
          listId: listCode,
          title: newItem.title,
          type: newItem.type,
          platform: newItem.platform,
          status: 'pending',
          addedAt: new Date().toISOString(),
          createdAt: serverTimestamp(),
          order: maxOrder + 1000, // Asegura que quede primero
          watchedAt: null,
          rating: null,
          review: null
        });
      }
      setIsModalOpen(false);
      setNewItem({ title: '', type: 'series', platform: platforms[0] });
      setIsEditing(false);
      setEditingId(null);
    } catch (error) { alert(`Error al guardar: ${error.message}`); } finally { setSaving(false); }
  };

  const confirmRatingCloud = async (e) => {
    e.preventDefault();
    if (!itemToRate) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'cinelist', itemToRate.id);
      await updateDoc(docRef, { status: 'watched', rating: Number(ratingData.rating), watchedAt: ratingData.date, review: ratingData.review });
      setIsRateModalOpen(false);
      setItemToRate(null);
    } catch (error) { alert(`Error: ${error.message}`); } finally { setSaving(false); }
  };

  const deleteItemCloud = async (id) => {
    if (window.confirm('¿Eliminar para ambos usuarios?')) {
      try { await deleteDoc(doc(db, 'cinelist', id)); } catch (error) { alert(`Error: ${error.message}`); }
    }
  };

  const handleJoinList = (e) => {
    e.preventDefault();
    if (inputCode.trim().length < 3) return alert("El código debe tener al menos 3 caracteres");
    localStorage.setItem('cinelist_code', inputCode.trim().toUpperCase());
    setListCode(inputCode.trim().toUpperCase());
  };

  const handleLogoutList = () => {
    if (window.confirm("¿Salir de esta lista?")) {
      localStorage.removeItem('cinelist_code');
      setListCode('');
      setItems([]);
    }
  };

  const openAddModal = () => { setIsEditing(false); setEditingId(null); setNewItem({ title: '', type: 'series', platform: platforms[0] }); setIsModalOpen(true); };
  const openEditModal = (item) => { setIsEditing(true); setEditingId(item.id); setNewItem({ title: item.title, type: item.type, platform: item.platform }); setIsModalOpen(true); };
  const initiateRateItem = (item) => { setItemToRate(item); setRatingData({ rating: 8, date: new Date().toISOString().split('T')[0], review: '' }); setIsRateModalOpen(true); };

  const getFilteredItems = () => {
    let filtered = items.filter(i => {
      const statusMatch = activeTab === 'watchlist' ? i.status === 'pending' : i.status === 'watched';
      const typeMatch = filterType === 'all' ? true : i.type === filterType;
      const platformMatch = filterPlatform === 'all' ? true : i.platform === filterPlatform;
      const searchMatch = i.title.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatch && typeMatch && platformMatch && searchMatch;
    });
    if (activeTab === 'history') {
      filtered.sort((a, b) => {
        if (sortHistoryBy === 'rating') return (b.rating || 0) - (a.rating || 0); 
        if (sortHistoryBy === 'date') return new Date(b.watchedAt || '').getTime() - new Date(a.watchedAt || '').getTime();
        return 0;
      });
    }
    return filtered;
  };

  const getPlatformColor = (p) => {
    const map = { 'Netflix': 'red', 'Amazon Prime': 'blue', 'Disney+': 'blue', 'Crunchyroll': 'yellow', 'Apple TV': 'gray', 'Paramount+': 'blue' };
    return map[p] || 'violet';
  };

  const filteredItems = getFilteredItems();

  if (!listCode) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-3 rounded-xl w-fit mx-auto mb-6"><Users size={32} className="text-white" /></div>
          <h1 className="text-2xl font-bold text-white mb-2">Bienvenido a CineList Pro</h1>
          <p className="text-gray-400 mb-8">Para empezar, crea un código único o ingresa el código de tu pareja.</p>
          <form onSubmit={handleJoinList} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Nombre de tu lista (Código)</label>
              <input type="text" placeholder="Ej: ERNESTO-CASA" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest uppercase focus:ring-2 focus:ring-violet-500 outline-none placeholder-gray-700" value={inputCode} onChange={e => setInputCode(e.target.value)} />
            </div>
            <Button type="submit" className="w-full py-3 px-6 text-lg">Entrar a la Lista</Button>
          </form>
          {deferredPrompt && <div className="mt-6 pt-6 border-t border-gray-800"><Button variant="install" onClick={handleInstallClick} className="w-full"><Download size={18} /> Instalar App</Button></div>}
          {authError && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-pulse"><p className="font-bold flex items-center justify-center gap-2"><AlertTriangle size={16}/> Error de Autenticación:</p><p>{authError}</p></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-violet-500/30 flex flex-col">
      {authError && <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2"><AlertTriangle size={18} />{authError}</div>}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="bg-violet-600/20 p-2 rounded-xl"><Cloud size={24} className="text-violet-400" /></div>
               <div className="flex flex-col"><h1 className="text-xl font-bold text-white leading-none">CineList Pro</h1><div className="flex items-center gap-1 text-violet-400 text-sm mt-1 bg-violet-900/10 px-2 py-0.5 rounded-md font-mono tracking-wider border border-violet-500/20"><Hash size={12} />{listCode}</div></div>
             </div>
             <div className="flex items-center gap-2">
               {deferredPrompt && <Button variant="install" onClick={handleInstallClick} className="!px-3 !py-2 text-xs sm:text-sm animate-pulse"><Download size={16} /> <span className="hidden sm:inline">Instalar</span></Button>}
               <Button variant="ghost" onClick={handleLogoutList} className="text-red-400 hover:bg-red-500/10 hover:text-red-300 !px-3" title="Salir de la lista"><LogOut size={24} /></Button>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex flex-1 items-center gap-1 bg-gray-950/50 p-1.5 rounded-2xl border border-gray-800">
              <button onClick={() => setActiveTab('watchlist')} className={`flex-1 py-3 px-2 rounded-xl text-base sm:text-lg font-bold transition-all text-center ${activeTab === 'watchlist' ? 'bg-gray-800 text-white shadow-lg ring-1 ring-white/10' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}>Por Ver</button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-2 rounded-xl text-base sm:text-lg font-bold transition-all text-center ${activeTab === 'history' ? 'bg-gray-800 text-white shadow-lg ring-1 ring-white/10' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}>Historial</button>
            </nav>
            <Button onClick={openAddModal} className="!py-4 !px-6 !text-lg !rounded-xl shadow-violet-900/40" disabled={!!authError}><Plus size={24} /> <span className="hidden sm:inline">Agregar</span></Button>
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
              {activeTab === 'history' && <div className="relative group"><select value={sortHistoryBy} onChange={(e) => setSortHistoryBy(e.target.value)} className="appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-violet-500 outline-none w-full md:w-auto"><option value="date">Por Fecha</option><option value="rating">Por Nota</option></select><Filter size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" /></div>}
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
                {!searchQuery && <Button variant="outline" onClick={openAddModal} className="!px-6 !py-3">Agregar Título</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    {...longPressEvents(item.id)} // EVENTO DE LONG PRESS AQUÍ
                    className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-violet-900/10 hover:border-violet-500/30 transition-all duration-300 flex flex-col relative select-none"
                    onContextMenu={(e) => e.preventDefault()} // Evitar menú del navegador
                  >
                    
                    {/* --- CAPA DE REORDENAMIENTO --- */}
                    {reorderModeId === item.id && (
                      <div className="absolute inset-0 z-50 bg-gray-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
                        <p className="text-violet-300 font-bold text-lg mb-2">Mover</p>
                        <div className="flex gap-4">
                          <Button variant="action" onClick={() => moveItem(item.id, -1)} className="!p-4 rounded-full"><ArrowUp size={32} /></Button>
                          <Button variant="action" onClick={() => moveItem(item.id, 1)} className="!p-4 rounded-full"><ArrowDown size={32} /></Button>
                        </div>
                        <button onClick={() => setReorderModeId(null)} className="mt-4 text-gray-400 hover:text-white flex items-center gap-2 text-sm"><X size={16}/> Cancelar</button>
                      </div>
                    )}

                    <div className="p-5 flex-1 relative">
                      {activeTab === 'watchlist' && (
                        <button onClick={() => openEditModal(item)} className="absolute top-4 right-4 text-gray-600 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all" title="Editar"><Edit2 size={20} /></button>
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
                          <button onClick={() => deleteItemCloud(item.id)} className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg" title="Eliminar"><Trash2 size={20} /></button>
                          <Button variant="primary" onClick={() => initiateRateItem(item)} className="!py-2 !px-4 !text-sm shadow-md"><CheckCircle size={16} /> Ya la vi</Button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => deleteItemCloud(item.id)} className="text-gray-500 hover:text-red-400 transition-colors text-sm flex items-center gap-1.5 hover:bg-red-500/10 px-2 py-1 rounded"><Trash2 size={16} /> Borrar</button>
                          <div className="text-xs text-gray-600 font-mono flex items-center gap-1"><Cloud size={12}/> Synced</div>
                        </>
                      )}
                    </div>
                  </div>
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
    </div>
  );
}