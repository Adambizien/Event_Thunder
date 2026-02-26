FROM node:25.7-alpine3.22

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3005

CMD ["npm", "start"]