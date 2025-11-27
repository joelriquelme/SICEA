# --- Etapa 1: Construcción (Build) ---
FROM node:18-alpine as build

WORKDIR /app

# Copiamos package.json primero para aprovechar caché
COPY package.json package-lock.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Construimos la app para producción (genera carpeta /dist)
RUN npm run build

# --- Etapa 2: Servidor (Nginx) ---
FROM nginx:alpine

# Copiamos los archivos construidos al servidor Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiamos nuestra config personalizada y sobrescribimos la default
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponemos el puerto 80 (interno del contenedor)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]