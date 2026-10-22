# Models & Neural Architectures

This directory houses the neural network weights and checkpoint definitions for the **AI Smart Traffic & Accident Detection System**.

## 1. Vehicle Detection: Ultralytics YOLOv8

The vehicle detection subsystem utilizes **YOLOv8** (You Only Look Once v8) pretrained on COCO 2017.

### Model Variants & Resource Comparison

| Model | Weights File | Parameters | Download Size | Inference Latency (CUDA) | Recommended Device |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **YOLOv8n** (Default) | `yolov8n.pt` | 3.2M | ~6.2 MB | ~15–25 ms | Laptop GPU / CPU |
| **YOLOv8s** | `yolov8s.pt` | 11.2M | ~22.5 MB | ~25–40 ms | Dedicated GPU |
| **YOLOv8m** | `yolov8m.pt` | 25.9M | ~52.0 MB | ~45–65 ms | Dedicated GPU / Server |

- The system defaults to **YOLOv8 Nano (`yolov8n.pt`)** to guarantee real-time throughput (>20 FPS) on consumer GPUs and laptop hardware without excessive VRAM consumption.
- On first startup, the model automatically downloads to the root cache or can be placed in `models/`.

### Supported Vehicle Classes
- `class 2`: `car`
- `class 3`: `motorcycle`
- `class 5`: `bus`
- `class 7`: `truck`

---

## 2. Accident & Anomaly Detection Architecture

### Honest Academic Disclosure
> [!IMPORTANT]
> A generic COCO-pretrained YOLO model detects static objects and cannot natively identify traffic accidents or collisions. 
> To detect potential accidents without fabricated claims:
> 1. The system deploys a **kinematic heuristic baseline** tracking velocity vectors, sudden deceleration thresholds ($a < -140\text{ px/s}^2$), sustained stationary durations in active corridors, and pairwise bounding box IoU intersections.
> 2. The system provides an extensible PyTorch interface (`DeepLearningAccidentDetector`) in `backend/app/services/accident_detector.py` for integrating custom video classification models.

### Integrating Custom Trained Accident Weights
If you train an optical flow CNN/LSTM, SlowFast, or Video Swin model on CADP:
- Target Input Tensor: `(Batch_size, Temporal_window=16, Channels=3, Height=224, Width=224)`
- Target Output: Softmax logit representing `[Normal Flow, Anomaly / Collision]`
- Place saved checkpoint at `models/cadp_accident_model.pt`.
