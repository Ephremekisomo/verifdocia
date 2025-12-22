# Utiliser une image Python officielle légère
FROM python:3.12-slim

# Éviter que Python ne génère des fichiers .pyc
ENV PYTHONDONTWRITEBYTECODE=1
# Éviter que Python n'utilise de tampon pour les sorties (logs en temps réel)
ENV PYTHONUNBUFFERED=1

# Installer les dépendances système nécessaires pour Tesseract et OpenCV
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-fra \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les dépendances Python
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste du code source
COPY . .

# Exposer le port que l'app utilise
EXPOSE 8000

# Commande pour lancer l'application (Render utilise PORT env var si besoin, mais on fixe 8000 par défaut)
CMD ["uvicorn", "main.py:app", "--host", "0.0.0.0", "--port", "8000"]
