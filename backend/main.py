from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pytesseract
import cv2
import numpy as np
import io
import logging

# Configuration de base
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration Tesseract (Windows)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

app = FastAPI(title="Fake Document Detection API", version="0.1.0")

# Configuration CORS pour permettre au frontend React de communiquer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En prod, restreindre à l'URL du frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "API de détection de faux documents est en ligne"}

@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    """
    Endpoint principal pour analyser un document uploadé.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image.")

    try:
        # Lecture du fichier image
        contents = await file.read()
        image_stream = io.BytesIO(contents)
        image = Image.open(image_stream)
        
        # 1. Analyse OCR basique (Extraction de texte)
        # Note: Assurez-vous que Tesseract est installé sur le système hôte
        try:
            extracted_text = pytesseract.image_to_string(image, lang='fra+eng')
        except Exception as e:
            logger.error(f"Erreur Tesseract: {e}")
            extracted_text = "Erreur OCR ou Tesseract non installé."

        # 2. Analyse heuristique simple
        # Conversion pour OpenCV
        np_image = np.array(image)
        # Convertir RGB à BGR pour OpenCV (si nécessaire)
        open_cv_image = cv2.cvtColor(np_image, cv2.COLOR_RGB2BGR)
        
        # Détection de flou (Variance de Laplacian)
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        is_blurry = bool(blur_score < 100.0)

        # 3. Analyse des Métadonnées (EXIF)
        exif_data = image._getexif()
        software_detected = None
        is_edited = False
        
        if exif_data:
            from PIL.ExifTags import TAGS
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == 'Software':
                    software_detected = str(value)
                    if any(tool in software_detected.lower() for tool in ['adobe', 'photoshop', 'gimp', 'paint']):
                        is_edited = True
                        break
        
        # Recherche de mots clés suspects ou attendus
        keywords_found = []
        suspicious_keywords = ["specimen", "exemple", "non officiel"]
        official_keywords = ["république", "diplôme", "certificat", "ministère"]
        
        text_lower = extracted_text.lower()
        
        for word in official_keywords:
            if word in text_lower:
                keywords_found.append(word)
                
        is_suspicious = any(word in text_lower for word in suspicious_keywords)

        # Construction de la réponse
        confidence_score = 0.8  # Score simulé pour le proof of concept
        if is_blurry:
            confidence_score -= 0.2
        if is_suspicious:
            confidence_score = 0.0
        if is_edited: # Pénalité si logiciel de retouche détecté
            confidence_score -= 0.3
        if len(keywords_found) > 0:
            confidence_score += 0.1
            
        confidence_score = min(max(confidence_score, 0.0), 1.0) # Clamp entre 0 et 1

        result = {
            "filename": file.filename,
            "is_authentic_probability": confidence_score,
            "details": {
                "ocr_text_preview": extracted_text[:200] + "...",
                "blur_score": round(blur_score, 2),
                "is_blurry": is_blurry,
                "keywords_detected": keywords_found,
                "suspicious_flags": is_suspicious,
                "software_detected": software_detected,
                "is_edited": is_edited
            }
        }
        
        return result

    except Exception as e:
        logger.error(f"Erreur lors de l'analyse: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")

# Si exécuté directement
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
