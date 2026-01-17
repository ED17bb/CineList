import React, { useState, useEffect } from 'react';
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
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, Film, Tv, Trash2, CheckCircle, Star, Calendar, 
  Search, Filter, MonitorPlay, X, Edit2, LogOut, 
  Users, Cloud, Loader2, Settings
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE (EDITAR AQUÍ) ---
// Ernesto: Pega aquí los valores que copiaste de tu consola de Firebase.
// Asegúrate de mantener las comillas "" alrededor de cada código.
const firebaseConfig = {
  apiKey: "AIzaSyD4Zs7YBFwLsPzto7S3UqI7PR9dLreRkK8",
  authDomain: "que-ver-4f4b6.firebaseapp.com",
  projectId: "que-ver-4f4b6",
  storageBucket: "que-ver-4f4b6.firebasestorage.app",
  messagingSenderId: "70647074088",
  appId: "1:70647074088:web:77fbdeecae7ddc557a141d"
};

// Detectamos si la configuración sigue siendo la de ejemplo
const isConfigured = firebaseConfig.apiKey !== "TU_API_KEY_PEGA_AQUI";

// Inicialización condicional para evitar errores si no hay config
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
// Definimos un ID fijo para tu app personal
const appId = 'cine-list-pro-movil'; 

// --- COMPONENTES UI ---

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/20",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
    ghost: "text-gray-400 hover:text-white hover:bg-white/5",
    outline: "border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white"
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
  
  // Inyección automática de Tailwind CSS (Estilos)
  useEffect(() => {
    const scriptId = 'tailwindcss-cdn';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // Si no está configurado, mostramos pantalla de ayuda
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center text-gray-100 font-sans">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
          <div className="bg-yellow-500/20 p-4 rounded-full w-fit mx-auto mb-6">
            <Settings size={40} className="text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Casi listo, Ernesto</h1>
          <p className="text-gray-400 mb-6">Solo falta conectar tus claves de Firebase.</p>
          <div className="bg-gray-950 rounded-xl p-4 text-left text-sm space-y-3 border border-gray-800 mb-6">
            <p className="font-bold text-gray-300">Instrucciones:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>Abre el archivo <code>App.jsx</code> (este archivo).</li>
              <li>Busca <code>const firebaseConfig</code> (al inicio).</li>
              <li>Reemplaza los valores con los de tu consola de Firebase.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Estados
  const [user, setUser] = useState(null);
  const [listCode, setListCode] = useState(() => localStorage.getItem('cinelist_code') || '');
  const [items, setItems] = useState([]);
  const [platforms, setPlatforms] = useState(['Netflix', 'Amazon Prime', 'Apple TV', 'Disney+', 'Crunchyroll', 'Paramount+']);
  const [loading, setLoading] = useState(true);

  // UI
  const [activeTab, setActiveTab] = useState('watchlist'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemToRate, setItemToRate] = useState(null);
  
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

  // Autenticación
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
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Carga de datos
  useEffect(() => {
    if (!isConfigured || !user || !listCode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'cinelist_cloud_items');

    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const myItems = fetchedItems.filter(item => item.listId === listCode);
      myItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setItems(myItems);
      
      const usedPlatforms = new Set(['Netflix', 'Amazon Prime', 'Apple TV', 'Disney+', 'Crunchyroll', 'Paramount+']);
      myItems.forEach(i => {
        if(i.platform) usedPlatforms.add(i.platform);
      });
      setPlatforms(Array.from(usedPlatforms));
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, listCode]);

  // --- ACCIONES ---

  const addItemToCloud = async (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    try {
      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'cinelist_cloud_items');
      
      if (isEditing && editingId) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'cinelist_cloud_items', editingId);
        await updateDoc(docRef, {
          title: newItem.title,
          type: newItem.type,
          platform: newItem.platform
        });
      } else {
        await addDoc(collectionRef, {
          listId: listCode,
          title: newItem.title,
          type: newItem.type,
          platform: newItem.platform,
          status: 'pending',
          addedAt: new Date().toISOString(),
          createdAt: serverTimestamp(),
          watchedAt: null,
          rating: null,
          review: null
        });
      }

      setIsModalOpen(false);
      setNewItem({ title: '', type: 'series', platform: platforms[0] });
      setIsEditing(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error adding/updating:", error);
      alert("Error al guardar. Verifica tu conexión.");
    }
  };

  const confirmRatingCloud = async (e) => {
    e.preventDefault();
    if (!itemToRate) return;

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'cinelist_cloud_items', itemToRate.id);
      await updateDoc(docRef, {
        status: 'watched',
        rating: Number(ratingData.rating),
        watchedAt: ratingData.date,
        review: ratingData.review
      });
      setIsRateModalOpen(false);
      setItemToRate(null);
    } catch (error) {
      console.error("Error rating:", error);
    }
  };

  const deleteItemCloud = async (id) => {
    if (window.confirm('¿Eliminar para ambos usuarios?')) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'cinelist_cloud_items', id);
        await deleteDoc(docRef);
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  const handleJoinList = (e) => {
    e.preventDefault();
    if (inputCode.trim().length < 3) return alert("El código debe tener al menos 3 caracteres");
    const code = inputCode.trim().toUpperCase();
    localStorage.setItem('cinelist_code', code);
    setListCode(code);
  };

  const handleLogoutList = () => {
    if (window.confirm("¿Salir de esta lista?")) {
      localStorage.removeItem('cinelist_code');
      setListCode('');
      setItems([]);
    }
  };

  // --- HELPERS Y RENDER ---

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewItem({ title: '', type: 'series', platform: platforms[0] });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setIsEditing(true);
    setEditingId(item.id);
    setNewItem({ title: item.title, type: item.type, platform: item.platform });
    setIsModalOpen(true);
  };

  const initiateRateItem = (item) => {
    setItemToRate(item);
    setRatingData({ rating: 8, date: new Date().toISOString().split('T')[0], review: '' });
    setIsRateModalOpen(true);
  };

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
    const map = {
      'Netflix': 'red', 'Amazon Prime': 'blue', 'Disney+': 'blue', 
      'Crunchyroll': 'yellow', 'Apple TV': 'gray', 'Paramount+': 'blue'
    };
    return map[p] || 'violet';
  };

  const filteredItems = getFilteredItems();

  if (!listCode) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-3 rounded-xl w-fit mx-auto mb-6">
            <Users size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Bienvenido a CineList Pro</h1>
          <p className="text-gray-400 mb-8">Para empezar, crea un código único o ingresa el código de tu pareja.</p>
          
          <form onSubmit={handleJoinList} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Nombre de tu lista (Código)</label>
              <input 
                type="text" 
                placeholder="Ej: ERNESTO-CASA" 
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest uppercase focus:ring-2 focus:ring-violet-500 outline-none placeholder-gray-700"
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full py-3">
               Entrar a la Lista
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-violet-500/30">
      
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="bg-violet-600/20 p-2 rounded-lg">
               <Cloud size={20} className="text-violet-400" />
             </div>
             <div className="hidden sm:block">
               <h1 className="text-sm font-bold text-white leading-none">CineList Cloud</h1>
               <span className="text-xs text-violet-400 font-mono tracking-wider">{listCode}</span>
             </div>
          </div>

          <nav className="flex items-center gap-1 bg-gray-950/50 p-1 rounded-xl border border-gray-800">
            <button onClick={() => setActiveTab('watchlist')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'watchlist' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>Por Ver</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>Historial</button>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleLogoutList} className="!px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300" title="Salir de la lista">
              <LogOut size={18} />
            </Button>
            <Button onClick={openAddModal} className="hidden sm:flex">
              <Plus size={18} /> Agregar
            </Button>
          </div>
          <button onClick={openAddModal} className="sm:hidden bg-violet-600 p-2 rounded-full text-white ml-2"><Plus size={20} /></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1 rounded-full text-sm border transition-colors ${filterType === 'all' ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>Todos</button>
              <button onClick={() => setFilterType('series')} className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border transition-colors ${filterType === 'series' ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}><Tv size={14} /> Series</button>
              <button onClick={() => setFilterType('movie')} className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border transition-colors ${filterType === 'movie' ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}><Film size={14} /> Películas</button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {activeTab === 'history' && (
                 <div className="relative group">
                    <select value={sortHistoryBy} onChange={(e) => setSortHistoryBy(e.target.value)} className="appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-violet-500 outline-none w-full md:w-auto">
                      <option value="date">Por Fecha</option>
                      <option value="rating">Por Nota</option>
                    </select>
                    <Filter size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
                 </div>
              )}

              <div className="relative flex-1 md:flex-none">
                <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="w-full appearance-none bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-violet-500 outline-none">
                  <option value="all">Todas las plataformas</option>
                  {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <MonitorPlay size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
              </div>

              <button onClick={() => setIsPlatformModalOpen(true)} className="text-xs text-violet-400 hover:text-violet-300 underline whitespace-nowrap">+ Plataforma</button>
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute inset-y-0 left-3 my-auto text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Buscar en ${activeTab === 'watchlist' ? 'Por Ver' : 'Historial'}...`}
              className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-xl pl-10 pr-10 py-3 focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder-gray-600"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white"><X size={16} /></button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 size={32} className="animate-spin mb-4 text-violet-500" />
            <p>Sincronizando con la nube...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-sm text-gray-500 flex gap-4">
              <span>Mostrando <strong>{filteredItems.length}</strong> {activeTab === 'watchlist' ? 'títulos pendientes' : 'títulos vistos'}</span>
              {activeTab === 'history' && filteredItems.length > 0 && (
                 <span className="flex items-center gap-1 text-yellow-500/80">
                   <Star size={12} /> Promedio: {(filteredItems.reduce((acc, curr) => acc + (curr.rating || 0), 0) / filteredItems.length).toFixed(1)}
                 </span>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-gray-900/30 rounded-2xl border-2 border-dashed border-gray-800">
                <Film size={48} className="mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-medium text-gray-400">{searchQuery ? 'No se encontraron resultados' : 'Lista vacía'}</h3>
                <p className="text-gray-600 mt-2 mb-6">{searchQuery ? 'Intenta con otro término' : 'Lo que agregues aquí aparecerá también en el dispositivo de tu pareja.'}</p>
                {!searchQuery && <Button variant="outline" onClick={openAddModal}>Agregar Título</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <div key={item.id} className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-violet-900/10 hover:border-violet-500/30 transition-all duration-300 flex flex-col">
                    <div className="p-5 flex-1 relative">
                      
                      {activeTab === 'watchlist' && (
                        <button 
                          onClick={() => openEditModal(item)}
                          className="absolute top-4 right-4 text-gray-600 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}

                      <div className="flex justify-between items-start mb-3 pr-8">
                        <Badge color={getPlatformColor(item.platform)}>{item.platform}</Badge>
                        {item.type === 'movie' ? <Film size={16} className="text-gray-500" /> : <Tv size={16} className="text-gray-500" />}
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-100 leading-tight mb-2 group-hover:text-violet-400 transition-colors">
                        {item.title}
                      </h3>

                      {activeTab === 'history' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-yellow-400">
                              <Star size={14} fill="currentColor" />
                              <span className="font-bold">{item.rating}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar size={14} />
                              <span>{new Date(item.watchedAt || '').toLocaleDateString()}</span>
                            </div>
                          </div>
                          {item.review && (
                            <div className="relative pl-3 border-l-2 border-gray-700 pt-1">
                              <p className="text-sm text-gray-400 italic line-clamp-3">"{item.review}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-5 py-4 bg-gray-950/30 border-t border-gray-800 flex items-center justify-between">
                      {activeTab === 'watchlist' ? (
                        <>
                          <button onClick={() => deleteItemCloud(item.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Eliminar"><Trash2 size={18} /></button>
                          <Button variant="primary" onClick={() => initiateRateItem(item)} className="!py-1 !px-3 !text-sm"><CheckCircle size={14} /> Ya la vi</Button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => deleteItemCloud(item.id)} className="text-gray-500 hover:text-red-400 transition-colors text-xs flex items-center gap-1"><Trash2 size={14} /> Borrar</button>
                          <div className="text-xs text-gray-600 font-mono">Synced</div>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{isEditing ? 'Editar Título' : 'Agregar a la lista compartida'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={addItemToCloud} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Título</label>
                <input type="text" autoFocus className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
                  <select className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-violet-500" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                    <option value="series">Serie</option>
                    <option value="movie">Película</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Plataforma</label>
                  <select className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-violet-500" value={newItem.platform} onChange={e => setNewItem({...newItem, platform: e.target.value})}>
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" variant="primary" className="flex-1">{isEditing ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRateModalOpen && itemToRate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-1">¿Qué tal estuvo?</h2>
            <p className="text-gray-400 text-sm mb-6">Califica <span className="text-violet-400 font-medium">{itemToRate.title}</span></p>
            <form onSubmit={confirmRatingCloud} className="space-y-6">
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-sm font-medium text-gray-300">Puntuación</label>
                   <span className="text-2xl font-bold text-yellow-400">{ratingData.rating}</span>
                </div>
                <input type="range" min="0" max="10" step="0.5" value={ratingData.rating} onChange={e => setRatingData({...ratingData, rating: Number(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 text-left">Tu Reseña</label>
                <textarea className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none resize-none h-24 text-sm" placeholder="Comentarios..." value={ratingData.review} onChange={e => setRatingData({...ratingData, review: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 text-left">Fecha</label>
                <input type="date" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 outline-none" value={ratingData.date} onChange={e => setRatingData({...ratingData, date: e.target.value})} required />
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setIsRateModalOpen(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" variant="primary" className="flex-1">Confirmar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPlatformModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Añadir Plataforma</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newPlatformName.trim() && !platforms.includes(newPlatformName)) {
                setPlatforms([...platforms, newPlatformName]);
                setNewPlatformName('');
                setIsPlatformModalOpen(false);
              }
            }}>
              <input type="text" autoFocus placeholder="Ej: HBO Max..." className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white mb-4 focus:ring-2 focus:ring-violet-500 outline-none" value={newPlatformName} onChange={e => setNewPlatformName(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsPlatformModalOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={!newPlatformName.trim()}>Añadir</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}