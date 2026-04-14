# Backend API - Camping Outdoors Bni Mtir

Backend Node.js + Express + MySQL pour la gestion des réservations et l'admin.

## Installation

### 1. Prérequis
- Node.js 14+ installé
- MySQL 5.7+ ou MariaDB 10.3+
- npm ou yarn

### 2. Installation des dépendances

```bash
cd backend
npm install
```

### 3. Configuration Base de Données

#### Créer la base de données MySQL

```bash
mysql -u root -p
CREATE DATABASE camping_outdoors CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Charger le schéma

```bash
mysql -u root -p camping_outdoors < database/schema_mysql.sql
```

### 4. Configuration .env

Édite le fichier `.env` selon ta configuration MySQL :

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_motdepasse
DB_NAME=camping_outdoors
DB_PORT=3306

PORT=3001
NODE_ENV=development
SESSION_SECRET=ta_clé_secrète_ici
```

### 5. Lancer le serveur

**Développement (avec rechargement automatique) :**
```bash
npm run dev
```

**Production :**
```bash
npm start
```

Le serveur tourne sur `http://localhost:3001`

## Endpoints API

### Admin (Authentification par session)

- `POST /api/admin/login` - Connexion admin
  - Body: `{ "username": "Admin", "password": "Diablox9@" }`
  - Response: `{ "token": "session_id", "message": "Login successful" }`

- `GET /api/admin/reservations` - Liste toutes les réservations (admin)
- `PATCH /api/admin/reservations/:code/status` - Modifier le statut
- `DELETE /api/admin/reservations/:code` - Supprimer une réservation
- `GET /api/admin/clients` - Liste tous les clients avec stats
- `GET /api/admin/revenue` - Chiffre d'affaires (optionnel: ?from=2026-04-01&to=2026-04-30)
- `POST /api/admin/logout` - Déconnexion

### Réservations (Public)

- `POST /api/reservations` - Créer une réservation
  - Body: `{ "nom": "...", "email": "...", "tel": "...", "type": "tiny_house", "checkin": "2026-04-20", "checkout": "2026-04-24", "prix": 400 }`

- `GET /api/reservations/:code` - Récupérer une réservation par code

- `POST /api/reservations/:code/cancel` - Annuler une réservation

### Santé

- `GET /api/health` - Vérifier que l'API fonctionne

## Identifiants Admin

- **Username:** Admin
- **Password:** Diablox9@

## Connexion Frontend

Le frontend en `http://localhost:5500/admin.html` appelle ces endpoints :

```javascript
const ADMIN_LOGIN_ENDPOINT = "/api/admin/login";
const ADMIN_RESERVATIONS_ENDPOINT = "/api/admin/reservations";
```

Assure-toi que le frontend utilise les bonnes URLs (port 3001 pour le backend).

## Structure du Projet

```
backend/
├── app.js                 # Application principale
├── package.json          # Dépendances
├── .env                  # Configuration
├── database.js           # Connexion MySQL
├── middleware.js         # Authentification
├── routes/
│   ├── admin.js         # Routes admin
│   └── reservations.js  # Routes réservations
└── database/
    └── schema_mysql.sql # Schéma SQL
```

## Troubleshooting

**Erreur: connect ECONNREFUSED 127.0.0.1:3306**
→ MySQL ne tourne pas. Démarre MySQL: `mysqld` ou `sudo systemctl start mysql`

**Erreur: Access denied for user 'root'@'localhost'**
→ Mauvais mot de passe. Vérifie `.env` DB_PASSWORD

**Erreur: Unknown database 'camping_outdoors'**
→ Exécute: `mysql -u root -p < database/schema_mysql.sql`

## Notes de Production

- Change `SESSION_SECRET` dans `.env`
- Mets `NODE_ENV=production`
- Utilise une vraie base de données hébergée
- Configure HTTPS et CORS correctement
- Ajoute rate limiting et validation
