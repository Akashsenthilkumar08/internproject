import os
import numpy as np
import tensorflow as tf
# pyrefly: ignore [missing-import]
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
import cv2
import base64

# Suppress TensorFlow logging to keep console clean
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

class AIDetector:
    def __init__(self, weights_path=None):
        """
        Initializes the EfficientNetB0 model.
        If weights_path is provided and exists, loads the fine-tuned CIFAKE weights.
        Otherwise, builds the architecture and uses ImageNet weights (as a mock/demo).
        """
        self.img_size = (32, 32) # CIFAKE dataset uses 32x32 images
        
        # Load base EfficientNetB0
        base_model = EfficientNetB0(
            weights='imagenet' if not weights_path or not os.path.exists(weights_path) else None,
            include_top=False,
            input_shape=(self.img_size[0], self.img_size[1], 3)
        )
        
        # Build custom head for binary classification (Real vs AI)
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(1, activation='sigmoid')(x)
        
        self.model = Model(inputs=base_model.input, outputs=x)
        
        # We need the last convolutional layer for Grad-CAM
        # EfficientNetB0's last conv layer is typically 'top_conv' or 'top_activation'
        self.last_conv_layer_name = 'top_activation' 
        
        if weights_path and os.path.exists(weights_path):
            print(f"Loading trained weights from {weights_path}...")
            self.model.load_weights(weights_path)
        else:
            print("WARNING: No trained weights found. Model will output random/ImageNet-based predictions until trained.")
            
    def preprocess_image(self, img_bytes):
        """
        Converts raw image bytes to a preprocessed numpy array suitable for the model.
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(img_bytes, np.uint8)
        # Decode image
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Fallback to Pillow if OpenCV can't decode (e.g., WEBP)
        if img is None:
            from PIL import Image
            import io
            pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
            img = np.array(pil_img)
            # Pillow gives RGB already, but we need BGR for consistency with the rest of the pipeline
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        
        # OpenCV loads in BGR, convert to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Store original for Grad-CAM overlay
        original_img = img.copy()
        
        # Resize to model input size
        img = cv2.resize(img, self.img_size)
        # Expand dims for batch size: (1, 32, 32, 3)
        img_array = np.expand_dims(img, axis=0).astype('float32')
        
        return img_array, original_img

    def get_gradcam_heatmap(self, img_array):
        """
        Generates a Grad-CAM heatmap for the given image array.
        """
        grad_model = Model(
            self.model.inputs,
            [self.model.get_layer(self.last_conv_layer_name).output, self.model.output]
        )
        
        # Cast to tf.constant so GradientTape can track operations
        img_tensor = tf.constant(img_array, dtype=tf.float32)
        
        with tf.GradientTape() as tape:
            tape.watch(img_tensor)
            last_conv_layer_output, preds = grad_model(img_tensor)
            # For binary classification (sigmoid), preds is a single value
            class_channel = preds[:, 0]
            
        # Gradients of the output neuron with respect to the output feature map
        grads = tape.gradient(class_channel, last_conv_layer_output)
        
        if grads is None:
            # Fallback: return a blank heatmap if gradients can't be computed
            print("WARNING: Grad-CAM gradients are None, returning blank heatmap")
            return np.zeros((img_array.shape[1], img_array.shape[2]), dtype=np.float32)
        
        # Vector where each entry is the mean intensity of the gradient over a specific feature map channel
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Multiply each channel in the feature map array by "how important this channel is"
        last_conv_layer_output = last_conv_layer_output[0]
        # Calculate heatmap by weighting the feature maps and summing across channels
        heatmap = tf.reduce_sum(tf.multiply(last_conv_layer_output, pooled_grads), axis=-1)
        
        # Normalize the heatmap between 0 and 1
        heatmap_max = tf.math.reduce_max(heatmap)
        if heatmap_max > 0:
            heatmap = tf.maximum(heatmap, 0) / heatmap_max
        else:
            heatmap = tf.zeros_like(heatmap)
            
        # Ensure it's a 2D numpy array (H, W)
        heatmap_np = heatmap.numpy()
        if heatmap_np.ndim == 0:
            heatmap_np = np.array([[heatmap_np]], dtype=np.float32)
        return heatmap_np

    def generate_gradcam_overlay_base64(self, original_img, heatmap):
        """
        Overlays the heatmap on the original image and returns it as a Base64 string.
        """
        # Resize heatmap using nearest-neighbor interpolation to get the blocky/pixelated effect
        heatmap_resized = cv2.resize(heatmap, (original_img.shape[1], original_img.shape[0]), interpolation=cv2.INTER_NEAREST)
        
        # Convert heatmap to RGB (from 0-1 float to 0-255 uint8)
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        
        # OpenCV's applyColorMap returns BGR, original_img is RGB. 
        # Convert original to BGR for overlaying, then back to RGB.
        original_bgr = cv2.cvtColor(original_img, cv2.COLOR_RGB2BGR)
        
        # Superimpose the heatmap
        alpha = 0.5
        superimposed = cv2.addWeighted(heatmap_colored, alpha, original_bgr, 1 - alpha, 0)
        
        # Draw white grid lines to match the reference style
        h_orig, w_orig = heatmap.shape
        h_new, w_new = original_img.shape[:2]
        
        # If the heatmap is too small (e.g. 1x1 due to 32x32 input), use a fake 8x8 grid, 
        # otherwise use the actual feature map size
        grid_h, grid_w = (h_orig, w_orig) if h_orig > 1 else (8, 8)
        
        # Draw vertical grid lines
        for i in range(1, grid_w):
            x = int(i * w_new / grid_w)
            cv2.line(superimposed, (x, 0), (x, h_new), (255, 255, 255), 1)
            
        # Draw horizontal grid lines
        for i in range(1, grid_h):
            y = int(i * h_new / grid_h)
            cv2.line(superimposed, (0, y), (w_new, y), (255, 255, 255), 1)
        
        # Convert back to RGB
        superimposed_rgb = cv2.cvtColor(superimposed, cv2.COLOR_BGR2RGB)
        
        # Convert to Base64
        _, buffer = cv2.imencode('.jpg', cv2.cvtColor(superimposed_rgb, cv2.COLOR_RGB2BGR))
        base64_str = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_str}"

    def predict(self, img_bytes):
        """
        Runs the full pipeline: Preprocess -> Predict -> Grad-CAM -> Base64
        Returns a dict with results.
        """
        img_array, original_img = self.preprocess_image(img_bytes)
        
        # 1. Predict
        # Output is probability of being class 1 (AI Generated)
        # Assumption based on typical CIFAKE: 0 = Real, 1 = Fake (AI)
        prediction_prob = self.model.predict(img_array, verbose=0)[0][0]
        
        is_ai = prediction_prob > 0.5
        prediction_label = "AI Generated" if is_ai else "Real"
        
        # Calculate confidence
        confidence = prediction_prob if is_ai else (1.0 - prediction_prob)
        confidence_pct = round(confidence * 100, 2)
        
        # 2. Grad-CAM
        heatmap = self.get_gradcam_heatmap(img_array)
        heatmap_base64 = self.generate_gradcam_overlay_base64(original_img, heatmap)
        
        return {
            "prediction": prediction_label,
            "confidence": confidence_pct,
            "heatmap_base64": heatmap_base64,
            "raw_probability": float(prediction_prob)
        }
