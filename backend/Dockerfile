# Usamos Python ligero
FROM python:3.11-slim

# Evitar que Python genere archivos .pyc y buffer de salida
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código de la carpeta backend
COPY . .

# Exponer el puerto
EXPOSE 8000

# Ejecutar Django (Escuchando en 0.0.0.0 para que Docker lo vea)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]