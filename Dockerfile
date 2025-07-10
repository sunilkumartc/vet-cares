FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.js"] 