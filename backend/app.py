import time
import os
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from model import AIDetector

app = Flask(__name__)
# Enable CORS for the local frontend
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize the model (it will load weights if they exist in the weights folder)
WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), 'weights', 'efficientnet_cifake.h5')
print("Initializing AI Detector...")
detector = AIDetector(weights_path=WEIGHTS_PATH)
print("Initialization complete.")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "AI Backend is running"}), 200

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    try:
        start_time = time.time()
        
        # Read file bytes
        img_bytes = file.read()
        
        # Run inference and Grad-CAM
        result = detector.predict(img_bytes)
        
        process_time = time.time() - start_time
        
        # Add processing time to result
        result["processing_time"] = round(process_time, 2)
        
        return jsonify(result), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

import urllib.request
import urllib.parse
import json

@app.route('/api/news', methods=['GET'])
def get_news():
    try:
        # Default category/query is 'artificial intelligence'
        query = request.args.get('q', 'artificial intelligence')
        
        # Read the API key from .env
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        api_key = "aecf447d7fb14435bacc1f2ffb5d3f33" # Fallback key
        
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("NEWS_API_KEY="):
                        api_key = line.split("=", 1)[1].strip()
                        break

        # Build URL
        safe_query = urllib.parse.quote(query)
        url = f"https://newsapi.org/v2/everything?q={safe_query}&sortBy=publishedAt&language=en&pageSize=20&apiKey={api_key}"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return jsonify(data), 200
            
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run on port 5001 to avoid conflicting with frontend on 5500
    app.run(host='0.0.0.0', port=5000, debug=True)

