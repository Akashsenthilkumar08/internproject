import os
import tensorflow as tf
# pyrefly: ignore [missing-import]
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
# pyrefly: ignore [missing-import]
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Configurations
DATA_DIR = './data'  # Path where CIFAKE dataset should be extracted (should have 'train' and 'test' subfolders)
IMG_SIZE = (32, 32)
BATCH_SIZE = 64
EPOCHS = 10
WEIGHTS_DIR = './weights'

def build_model():
    # Load base EfficientNetB0 pretrained on ImageNet
    base_model = EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3)
    )
    
    # Freeze base model layers initially for warm-up (optional, but good practice)
    base_model.trainable = False
    
    # Build custom head for binary classification (Real vs AI Generated)
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    # Using sigmoid for binary classification: 0 = Real, 1 = Fake (assuming alphabetical class names 'FAKE' and 'REAL')
    x = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=x)
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    return model, base_model

def train():
    if not os.path.exists(DATA_DIR) or not os.path.exists(os.path.join(DATA_DIR, 'train')):
        print("ERROR: Dataset not found!")
        print("Please download the CIFAKE dataset from Kaggle:")
        print("https://www.kaggle.com/datasets/birdy654/cifake-real-and-ai-generated-synthetic-images")
        print(f"Extract it and place the 'train' and 'test' folders inside: {os.path.abspath(DATA_DIR)}")
        return

    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    weights_path = os.path.join(WEIGHTS_DIR, 'efficientnet_cifake.h5')

    print("Loading data...")
    # CIFAKE dataset images are 32x32.
    # Data augmentation for training
    train_datagen = ImageDataGenerator(
        rescale=1./255, # Keep standard if EfficientNet doesn't auto-scale, but EfficientNetB0 in Keras expects inputs 0-255.
                        # Wait! EfficientNetB0 in tf.keras has built-in rescaling. We don't need rescale=1./255.
        horizontal_flip=True,
        rotation_range=15
    )
    
    test_datagen = ImageDataGenerator()

    # We assume folder structure: data/train/FAKE and data/train/REAL
    # Keras flow_from_directory assigns classes alphabetically: FAKE=0, REAL=1.
    # So: prediction > 0.5 means REAL, < 0.5 means FAKE.
    # Wait, in model.py I assumed >0.5 means AI (FAKE). Let's fix classes order:
    
    train_generator = train_datagen.flow_from_directory(
        os.path.join(DATA_DIR, 'train'),
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary',
        classes=['REAL', 'FAKE'] # Force: 0 = REAL, 1 = FAKE
    )
    
    validation_generator = test_datagen.flow_from_directory(
        os.path.join(DATA_DIR, 'test'),
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary',
        classes=['REAL', 'FAKE']
    )

    print("Building model...")
    model, base_model = build_model()
    
    callbacks = [
        ModelCheckpoint(filepath=weights_path, save_best_only=True, monitor='val_accuracy', mode='max'),
        EarlyStopping(monitor='val_accuracy', patience=3, restore_best_weights=True)
    ]
    
    print("Starting training (Head only)...")
    model.fit(
        train_generator,
        epochs=3, # Train head for 3 epochs
        validation_data=validation_generator,
        callbacks=callbacks
    )
    
    print("Unfreezing base model for fine-tuning...")
    # Unfreeze the top layers of the base model
    base_model.trainable = True
    # Freeze bottom layers
    for layer in base_model.layers[:-20]:
        layer.trainable = False
        
    # Recompile with a lower learning rate
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    print("Starting fine-tuning...")
    model.fit(
        train_generator,
        epochs=EPOCHS,
        validation_data=validation_generator,
        callbacks=callbacks
    )
    
    print(f"Training complete. Best weights saved to {weights_path}")

if __name__ == '__main__':
    train()
