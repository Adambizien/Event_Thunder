## DÉCONNEXION (Logout)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│              Header.tsx / Profile.tsx / App.tsx                  │
│                   Click "Déconnexion"                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    POST /api/auth/logout
                    (Bearer Token in header)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (NestJS)                          │
│                   (Router/Proxy)                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
              Forward to Auth Service
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AUTH SERVICE (NestJS)                          │
│              AuthController.logout()                             │
│               AuthService.logout()                               │
│                                                                  │
│  1️⃣ Extract token from header                                    │
│  2️⃣ Verify token (JWT validation)                               │
│  3️⃣ Add token to blacklist (in-memory Set)                       │
│  4️⃣ Return success message                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    Return: {message: "Déconnexion réussie"}
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                                                                  │
│        1️⃣ Remove token from localStorage                         │
│        2️⃣ Remove user from localStorage                          │
│        3️⃣ Clear state (user = null)                              │
│        4️⃣ Redirect to /login                                     │
│                                                                  │
│        ✓ Utilisateur complètement déconnecté                    │
└─────────────────────────────────────────────────────────────────┘
```

### Résumé Déconnexion:
- **Frontend** → **API Gateway** → **Auth Service** → **Blacklist token**
- **Processus** :
  1. Envoi du token JWT au serveur
  2. Vérification du token (valide ou expiré)
  3. Token ajouté à la blacklist en mémoire (empêche la réutilisation)
  4. localStorage vidé côté client
  5. Redirection vers login
- **Sécurité** : Token blacklisté côté serveur pour éviter réutilisation même si volé
- **Note** : Blacklist réinitialisée au redémarrage du serveur (voir amélioration DB Redis)