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

# Configuration Tesseract
# Sur Windows, on utilise le chemin fourni par l'utilisateur. 
# Sur Render (Linux), Tesseract sera dans le PATH après l'installation via Docker.
import os
TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
else:
    # Sur Linux, tesseract est généralement dans /usr/bin/tesseract
    # Si on ne définit rien, pytesseract le cherche dans le PATH
    pass

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
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image.")

    try:
        contents = await file.read()
        image_stream = io.BytesIO(contents)
        image = Image.open(image_stream)
        
        try:
            extracted_text = pytesseract.image_to_string(image, lang='fra+eng')
        except Exception as e:
            logger.error(f"Erreur Tesseract: {e}")
            extracted_text = "Erreur OCR ou Tesseract non installé."

        np_image = np.array(image)
        open_cv_image = cv2.cvtColor(np_image, cv2.COLOR_RGB2BGR)
        
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        is_blurry = bool(blur_score < 100.0)

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
        
        keywords_found = []
        suspicious_keywords = ["specimen", "exemple", "non officiel"]
        official_keywords = ["république", "diplôme", "certificat", "ministère"]
        
        text_lower = extracted_text.lower()
        
        for word in official_keywords:
            if word in text_lower:
                keywords_found.append(word)
                
        is_suspicious = any(word in text_lower for word in suspicious_keywords)

        confidence_score = 0.8
        if is_blurry:
            confidence_score -= 0.2
        if is_suspicious:
            confidence_score = 0.0
        if is_edited:
            confidence_score -= 0.3
        if len(keywords_found) > 0:
            confidence_score += 0.1
            
        confidence_score = min(max(confidence_score, 0.0), 1.0)

        doc_type = None
        if "diplôme" in text_lower:
            doc_type = "Diplôme"
        elif "certificat" in text_lower:
            doc_type = "Certificat"
        elif "carte" in text_lower and "identité" in text_lower:
            doc_type = "Carte d'identité"

        issuer = None
        if "ministère" in text_lower:
            issuer = "Ministère"
        elif "république" in text_lower:
            issuer = "République"

        import re
        id_numbers = re.findall(r"\b[A-Z]{1,3}\d{5,}\b", extracted_text)
        numeric_ids = re.findall(r"\b\d{6,}\b", extracted_text)
        id_numbers = list(set(id_numbers + numeric_ids))[:5]
        dates = re.findall(r"\b\d{2}/\d{2}/\d{4}\b", extracted_text)
        years = re.findall(r"\b(19|20)\d{2}\b", extracted_text)
        dates = list(set(dates))[:5]
        years = list(set(years))[:5]

        research = {
            "doc_type": doc_type,
            "issuer": issuer,
            "id_numbers": id_numbers,
            "dates": dates,
            "years": years,
            "risk_flags": {
                "edited": is_edited,
                "suspicious_keywords": is_suspicious,
                "blurry": is_blurry
            }
        }

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
                "is_edited": is_edited,
                "research": research
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
