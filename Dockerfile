FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Skip build in docker - we run dev server instead
# RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]