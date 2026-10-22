# Datasets Guide - AI Smart Traffic & Accident Detection System

This repository is designed for academic experimentation and production deployment across traffic monitoring and anomaly detection tasks.

## 1. Supported Datasets

### A. UA-DETRAC (Vehicle Detection & Tracking Benchmark)
- **Description**: The University at Albany DETRAC dataset consists of 100 hours of traffic video captured from 24 camera locations in China, annotated with 1.21 million bounding boxes of 8,250 vehicles.
- **Classes**: Car, Bus, Van, Others.
- **Primary Use**: Fine-tuning YOLO vehicle detection and evaluating multi-object tracking (MOTA, MOTP, IDF1).
- **Access & License**: Available at [UA-DETRAC Benchmark](http://detrac-db.rit.albany.edu/) under academic research terms.

### B. CADP (Car Accident Detection and Prediction)
- **Description**: Publicly accessible car accident video dataset containing 1,416 traffic surveillance videos with annotated spatio-temporal accident bounding boxes, accident occurrence frames, and incident categories.
- **Primary Use**: Training and benchmarking spatio-temporal action recognition and anomaly classification models (CNN/LSTM, Video Swin, I3D).
- **Access & License**: Available via academic repositories (e.g. GitHub/Zenodo) according to author licensing terms.

### C. COCO 2017 (Common Objects in Context)
- **Description**: Large-scale object detection dataset used for pretraining YOLOv8.
- **Vehicle Classes Extracted**:
  - `class 2`: `car`
  - `class 3`: `motorcycle`
  - `class 5`: `bus`
  - `class 7`: `truck`

---

## 2. Directory Structure for Custom Datasets

Place downloaded datasets into the `datasets/` directory structured as follows:

```text
datasets/
├── ua_detrac/
│   ├── images/
│   │   ├── train/
│   │   └── val/
│   └── labels/
│       ├── train/
│       └── val/
├── cadp/
│   ├── accident_videos/
│   ├── normal_videos/
│   └── annotations.json
└── README.md
```

---

## 3. Training & Fine-Tuning Pipeline

### Fine-Tuning YOLO on UA-DETRAC
```bash
# Activate backend environment
.\backend\venv\Scripts\activate

# Fine-tune YOLOv8n on UA-DETRAC YAML config
yolo detect train data=datasets/ua_detrac/data.yaml model=yolov8n.pt epochs=50 imgsz=640 batch=16
```

### Accident Classification Interface
The system provides a plug-and-play deep learning detector interface in `backend/app/services/accident_detector.py` under the class `DeepLearningAccidentDetector`.

To load a custom CNN/LSTM or Video Transformer model:
1. Export model weights to PyTorch TorchScript (`.pt`) or ONNX (`.onnx`).
2. Place weights in `models/accident_detector.pt`.
3. Set `model_path="models/accident_detector.pt"` in the detector initialization.
