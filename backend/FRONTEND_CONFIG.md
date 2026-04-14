// Configuration Frontend pour connecter le backend

// Si le frontend et backend tournent en local sur des ports différents:
// Frontend: http://localhost:5500  (Live Server)
// Backend: http://localhost:3001   (Node.js)

// Dans admin.html, assure-toi que ces endpoints pointent vers le bon port:

const ADMIN_LOGIN_ENDPOINT = "http://localhost:3001/api/admin/login";
const ADMIN_RESERVATIONS_ENDPOINT = "http://localhost:3001/api/admin/reservations";

// Si ton frontend est en production (sur Netlify/Vercel par exemple):
// Change les URLs en:
// const ADMIN_LOGIN_ENDPOINT = "https://ton-api.com/api/admin/login";
// const ADMIN_RESERVATIONS_ENDPOINT = "https://ton-api.com/api/admin/reservations";

// Exemple de connexion:
// POST http://localhost:3001/api/admin/login
// Body: { "username": "Admin", "password": "Diablox9@" }
// Response: { "token": "...", "message": "Login successful" }

// Le token sera envoyé automatiquement dans les en-têtes des requêtes suivantes
// grâce à: credentials: 'include' et les cookies de session
