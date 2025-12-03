# --- Etapa 1: Construcción (Build) ---
FROM node:18-alpine as build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
# El código compilado queda en /app/dist

# --- Etapa 2: Servidor (Mínimo) ---
FROM nginx:alpine

# Copiamos la configuración de Nginx para el try_files (ya creada en pasos anteriores)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# El código compilado (dist) NO se copia aquí. 
# Se montará en /usr/share/nginx/html en el runtime.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]