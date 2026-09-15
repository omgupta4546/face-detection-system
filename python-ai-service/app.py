import gradio as gr
import spaces
import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from deepface import DeepFace
import numpy as np
import cv2
import traceback
from fastapi import UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Create Gradio demo
def status_check():
    return "✅ Smart Classroom AI Backend is running!"

demo = gr.Interface(
    fn=status_check,
    inputs=None,
    outputs="text",
    title="Smart Classroom AI API"
)

# Access Gradio's internal FastAPI app BEFORE launch
app = demo.app

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Stateless Face Extraction API is running!"}

@spaces.GPU
def run_deepface(img_path):
    """Run DeepFace on GPU (ZeroGPU allocates GPU for this function)"""
    return DeepFace.represent(
        img_path=img_path,
        model_name="ArcFace",
        detector_backend="retinaface",
        enforce_detection=True
    )

@app.post("/api/extract")
async def extract_faces(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        temp_img_path = f"temp_{os.getpid()}.jpg"
        cv2.imwrite(temp_img_path, img)

        try:
            faces = run_deepface(temp_img_path)

            embeddings = []
            for face in faces:
                embeddings.append({
                    "embedding": face["embedding"],
                    "facial_area": face["facial_area"],
                    "confidence": face["face_confidence"]
                })

            result = {"status": "success", "faces": embeddings}
        except ValueError:
            result = {"status": "success", "faces": []}

        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

        return JSONResponse(content=result)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Launch — Gradio handles the server
demo.launch(server_name="0.0.0.0", server_port=7860)
