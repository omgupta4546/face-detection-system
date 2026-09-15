import gradio as gr
import spaces
import os
import cv2
import json

os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from deepface import DeepFace

@spaces.GPU
def run_deepface(img_path):
    """Run DeepFace on GPU (ZeroGPU allocates GPU for this function)"""
    return DeepFace.represent(
        img_path=img_path,
        model_name="ArcFace",
        detector_backend="retinaface",
        enforce_detection=True
    )

def extract_faces(image_filepath):
    try:
        # Gradio passes the filepath to the uploaded image
        faces = run_deepface(image_filepath)

        embeddings = []
        for face in faces:
            embeddings.append({
                "embedding": face["embedding"],
                "facial_area": face["facial_area"],
                "confidence": face["face_confidence"]
            })

        return json.dumps({"status": "success", "faces": embeddings})
    except ValueError:
        return json.dumps({"status": "success", "faces": []})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return json.dumps({"status": "error", "message": str(e)})

# Create Gradio demo which acts as our API
demo = gr.Interface(
    fn=extract_faces,
    inputs=gr.Image(type="filepath"),
    outputs="text",
    title="Smart Classroom AI API",
    description="Stateless Face Extraction API using DeepFace + ArcFace on ZeroGPU."
)

if __name__ == "__main__":
    demo.launch()
