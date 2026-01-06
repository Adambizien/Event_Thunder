FROM node:25-alpine3.22

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3002

CMD ["npm", "start"]