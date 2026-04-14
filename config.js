// Configuration API - Édite les URLs selon l'environnement

const ENV = {
  LOCAL: {
    API_BASE: 'http://localhost:3001',
    ADMIN_LOGIN: 'http://localhost:3001/api/admin/login',
    ADMIN_RESERVATIONS: 'http://localhost:3001/api/admin/reservations',
    ADMIN_CLIENTS: 'http://localhost:3001/api/admin/clients',
    ADMIN_REVENUE: 'http://localhost:3001/api/admin/revenue'
  },
  PRODUCTION: {
    API_BASE: 'https://camping-outdoors-api.onrender.com',
    ADMIN_LOGIN: 'https://camping-outdoors-api.onrender.com/api/admin/login',
    ADMIN_RESERVATIONS: 'https://camping-outdoors-api.onrender.com/api/admin/reservations',
    ADMIN_CLIENTS: 'https://camping-outdoors-api.onrender.com/api/admin/clients',
    ADMIN_REVENUE: 'https://camping-outdoors-api.onrender.com/api/admin/revenue'
  }
};

// Détecte automatiquement l'environnement
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const CONFIG = isLocalhost ? ENV.LOCAL : ENV.PRODUCTION;

// Exporte pour utilisation dans admin.js
window.APP_CONFIG = CONFIG;
