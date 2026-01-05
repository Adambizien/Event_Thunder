# Utiliser l'image Node Alpine
FROM node:20-alpine

WORKDIR /app

# Copier package.json et package-lock.json pour installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le reste du projet
COPY . .

# Exposer le port que Vite utilisera
EXPOSE 5173

# Lancer Vite en mode dev et rendre le serveur accessible depuis l'extérieur
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
