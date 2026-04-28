# Event Thunder - Guide de mise en production

Ce document decrit une mise en prod sur un serveur sans ports publics ouverts, avec Nginx en local et Cloudflare Tunnel pour l'exposition externe.

## 1) Architecture cible

- Docker Compose lance tous les services en local sur le serveur.
- Nginx sert le frontend et reverse-proxy les routes API.
- Cloudflare Tunnel expose seulement Nginx (et eventuellement un tunnel dedie Stripe si voulu).
- Aucun port applicatif (8000, 3006, 5173, etc.) ne doit etre ouvert publiquement sur le firewall.

## 2) Pre-requis serveur

- Docker + Docker Compose installes
- Node.js + npm installes (necessaires pour migrations Prisma via script)
- Nginx installe
- cloudflared installe
- DNS Cloudflare configure
- Git clone du repo dans un dossier stable

## 3) Fichiers a configurer avant demarrage

### 3.1 .env racine

Copier et adapter le fichier .env a la racine.

Variables importantes a verifier:

- NODE_ENV=production
- API_GATEWAY_PORT (ex: 8000)
- BILLING_SERVICE_PORT (ex: 3006)
- FRONTEND_PORT (ex: 5173)
- API_GATEWAY_URL (URL publique API)
- FRONTEND_URL (URL publique frontend)
- GOOGLE_CLIENT_ID
- GOOGLE_REDIRECT_URI
- AI_API_URL
- AI_MODEL

Important OAuth Google:

- GOOGLE_REDIRECT_URI doit pointer vers:
  - https://TON_DOMAINE/api/auth/google/callback

### 3.2 Secrets Docker

Les fichiers suivants doivent exister dans le dossier secrets:

- secrets/postgres_user.txt
- secrets/postgres_password.txt
- secrets/jwt_secret.txt
- secrets/reset_password_jwt_secret.txt
- secrets/google_client_secret.txt
- secrets/stripe_secret_key.txt
- secrets/stripe_webhook_secret.txt
- secrets/resend_api_key.txt
- secrets/post_cron_secret.txt
- secrets/ai_api_key.txt
- secrets/rabbitmq_default_user.txt
- secrets/rabbitmq_default_pass.txt
- secrets/rabbitmq_url.txt

sudo chown -R adam:adam secrets
chmod 700 secrets
chmod 600 secrets/*.txt

### 3.3 Deploiement GitHub Actions via Tailscale

Si le serveur n'expose pas SSH publiquement, le CD GitHub Actions peut passer par Tailscale.

Secrets GitHub a ajouter:

- TS_OAUTH_CLIENT_ID
- TS_OAUTH_SECRET
- TS_TAILNET_HOST
- TS_SSH_USER

Valeurs attendues:

- TS_TAILNET_HOST: nom MagicDNS ou IP Tailscale du serveur
- TS_SSH_USER: utilisateur Linux pour le deploiement (ex: adam)

Configuration serveur requise:

- Tailscale installe et connecte sur le nouveau serveur
- Tailscale SSH active sur le serveur:
  - sudo tailscale set --ssh=true
- Une regle SSH Tailscale doit autoriser le tag GitHub Actions (ex: tag:ci) a se connecter au serveur

Exemple de principe cote Tailscale:

- le runner GitHub rejoint le tailnet avec le tag `tag:ci`
- le workflow se connecte au serveur avec `tailscale ssh`
- aucun port SSH public n'a besoin d'etre ouvert

## 4) Demarrage propre (obligatoire)

Utiliser le script fourni (migrations + build + startup): (attention il faut npm i dans chaque service pour que les migrations Prisma fonctionnent)

- chmod +x scripts/start-clean-prisma.sh
- ./scripts/start-clean-prisma.sh

Ce script:

- demarre postgres/rabbitmq
- attend postgres healthy
- applique les migrations Prisma (user, subscription, event, comment, ticketing, post)
- build et demarre toute la stack Docker

## 5) Stripe webhook (port 3006)

Endpoint webhook Stripe du projet:

- /api/billing/stripe/webhook

### Option A (recommandee): via domaine principal (Nginx/API Gateway)

URL webhook Stripe:

- https://TON_DOMAINE/api/billing/stripe/webhook

### Option B: tunnel dedie vers billing-service:3006

Si vous gardez un tunnel direct 3006, URL webhook Stripe:

- https://TON_TUNNEL_3006/api/billing/stripe/webhook

Exemple local/test:

- ngrok http 3006
- URL Stripe = https://XXXX.ngrok-free.app/api/billing/stripe/webhook

Important:

- Le endpoint attend la signature Stripe (header stripe-signature)
- STRIPE_WEBHOOK_SECRET doit correspondre au endpoint configure dans Stripe

## 6) Nginx (reverse proxy local)

Objectif:

- frontend -> container frontend (port local FRONTEND_PORT)
- /api -> api-gateway (port local API_GATEWAY_PORT)

Exemple de logique:

- location / -> http://127.0.0.1:5173
- location /api/ -> http://127.0.0.1:8000

Adaptez aux ports reels de votre .env.

## 7) Cloudflare Tunnel

Exposer uniquement Nginx (sans ouvrir de ports publics serveur).

Exemple ingress cloudflared:

- host app: service http://127.0.0.1:80
- host api: service http://127.0.0.1:80 (routes /api gerees par Nginx)
- host webhook stripe (optionnel): service http://127.0.0.1:3006

Avec cette approche, le firewall peut rester strict sur les entrees publiques.

## 8) Cron Linux (posts reseaux + logs)

Le dispatch des confirmations de posts reseaux se fait via endpoint interne:

- POST /api/posts/internal/dispatch-due
- Header requis: x-cron-secret

Ajouter une crontab (ex: toutes les 5 minutes):

- */5 * * * * cd /chemin/Event_Thunder && /usr/bin/curl -fsS -X POST "https://TON_DOMAINE/api/posts/internal/dispatch-due" -H "x-cron-secret:$(cat secrets/post_cron_secret.txt)" >> logs/post-cron.log 2>&1

Verifier que le dossier logs existe (deja present dans le repo) et que l'utilisateur cron a les droits d'ecriture.

## 9) Rotation des logs (recommande)

Configurer logrotate pour logs/post-cron.log (journalier ou hebdo, compression, retention).

Exemple simple:

- rotation 14
- compress
- missingok
- notifempty

## 10) Checklist finale avant go-live

- .env prod valide (URLs, ports, NODE_ENV)
- Tous les secrets presents et non vides
- GOOGLE_REDIRECT_URI exact dans Google Cloud Console
- Stripe webhook configure sur la bonne URL
- STRIPE_WEBHOOK_SECRET correct
- Script start-clean-prisma.sh execute avec succes
- docker compose ps: tous les services healthy/running
- Cron actif et logs qui s'ecrivent dans logs/post-cron.log
- Nginx OK (frontend + /api)
- Cloudflare Tunnel OK
- Sauvegarde reguliere de la base Postgres (a ajouter si pas en place)

## 11) Points souvent oublies

- Regenerer Prisma apres changement schema sur chaque service concerne
- Aligner FRONTEND_URL, API_GATEWAY_URL, GOOGLE_REDIRECT_URI sur le meme domaine public
- Verifier les secrets apres rotation (Stripe, JWT, Resend, Google)
- Surveiller l'espace disque (logs + volumes postgres)
- Tester un cycle complet apres deploy:
  - login Google
  - paiement Stripe
  - webhook Stripe
  - post reseau programme -> email -> confirmation
