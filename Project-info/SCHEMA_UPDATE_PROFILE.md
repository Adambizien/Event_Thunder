## PROFIL (Update Profile & Password)

### Mise à jour du profil

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                      Profile.tsx                                 │
│         (firstName, lastName, email, phoneNumber)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    PUT /api/users/profile
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (NestJS)                          │
│                   (Router/Proxy)                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
              Forward to User Service
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   USER SERVICE (NestJS)                          │
│              UsersController.updateProfile()                     │
│               UsersService.updateProfile()                       │
│                                                                  │
│  1️⃣ Find user by current email                                   │
│  2️⃣ If new email → check if already taken                        │
│  3️⃣ Update firstName, lastName, phoneNumber                      │
│  4️⃣ Save to DB                                                   │
│  5️⃣ Return updated user                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    Return: {user: {...}}
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│        ✓ Update localStorage (user)                              │
│        ✓ Show success message                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Mise à jour du mot de passe

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                      Profile.tsx                                 │
│         (currentPassword, newPassword, confirmPassword)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    PATCH /api/users/password
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (NestJS)                          │
│                   (Router/Proxy)                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
              Forward to User Service
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   USER SERVICE (NestJS)                          │
│              UsersController.updatePassword()                    │
│               UsersService.updatePassword()                      │
│                                                                  │
│  1️⃣ Find user by email (from JWT/token)                          │
│  2️⃣ Hash new password with bcrypt                               │
│  3️⃣ Update password in DB                                        │
│  4️⃣ Return success message                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    Return: {message: "..."}
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│         ✓ Logout user (clear localStorage)                       │
│         ✓ Redirect to login                                      │
│         ✓ Force re-authentication with nouveau password         │
└─────────────────────────────────────────────────────────────────┘
```

### Résumé Profil:
- **Mise à jour infos** : Frontend → API Gateway → User Service → Update DB
- **Changement password** : Frontend → API Gateway → User Service → Update DB → Logout & Redirect Login
- **Vérifications** : Email unique (si changé), password validation
- **Stockage** : localStorage mis à jour après succès

---