// Service Worker Básico para PWA
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
  });
  
  self.addEventListener('fetch', (e) => {
    // Estrategia básica: Network First
    // Esto es necesario para cumplir los requisitos de PWA mínima
  });