# Veritas EE Pipeline

**An Earth observation and AI pipeline for satellite imagery acquisition, land-cover segmentation, and geospatial analysis.**

Veritas EE Pipeline combines Google Earth Engine's satellite imagery infrastructure with a machine-learning workflow built around YOLO26 and Apple's MLX framework.

The project focuses on acquiring geographically diverse satellite imagery, generating corresponding land-cover segmentation masks, and preparing labeled datasets for model training and evaluation.

## Overview

The pipeline consists of three primary stages:

1. **Satellite Imagery Acquisition** – Retrieves Sentinel-2 satellite imagery using Google Earth Engine.
2. **Land-Cover Annotation** – Uses Google Dynamic World labels to generate pixel-level land-cover masks and converts these masks into segmentation annotations.
3. **Model Development** – Uses a YOLO26 implementation built on Apple's MLX framework for machine-learning experimentation on Apple Silicon.

## 1. Satellite Imagery Acquisition

The imagery acquisition component uses two Google Earth Engine datasets:

| Dataset | Purpose |
|---|---|
| Sentinel-2 Harmonized | Multispectral satellite imagery |
| Google Dynamic World V1 | Pixel-level land-cover classification |

### Image Generation

`imageLoading.py` automates the acquisition of satellite imagery.

The script:

- Randomly samples geographic locations from a predefined collection of global locations.
- Introduces geographic variation around each sampling coordinate.
- Selects a random acquisition date within the configured date range.
- Searches for Sentinel-2 imagery with cloud coverage below the specified threshold.
- Links Sentinel-2 imagery with corresponding Dynamic World labels.
- Exports RGB satellite imagery and corresponding segmentation masks.

### Acquisition Parameters

The default configuration includes:

| Parameter | Value |
|---|---:|
| Target images | 15,000 |
| Image dimensions | 512 × 512 |
| Spatial resolution | 10 meters per pixel |
| Maximum cloud coverage | 20% |
| Temporal range | April 2017 – September 2025 |
| Date search window | 60 days |
| Parallel workers | 32 |
| Training/validation split | 80/20 |

The imagery is generated using the Earth Engine high-volume endpoint to support parallel image requests.

### Geographic Diversity

`consts.py` contains predefined geographic sampling locations across a variety of environmental and geographic categories, including:

- Rainforests and tropical ecosystems
- Mountains and glaciers
- Deserts
- Urban environments
- Wetlands and lakes
- Beaches and coastal environments
- Arctic and subarctic environments
- Grasslands and agricultural regions

This sampling strategy is intended to introduce geographic and environmental diversity into the training dataset.

## 2. Land-Cover Segmentation

The pipeline uses Google Dynamic World's nine land-cover classes.

| Class ID | Land-cover class |
|---:|---|
| 0 | Water |
| 1 | Trees |
| 2 | Grass |
| 3 | Flooded Vegetation |
| 4 | Crops |
| 5 | Shrub and Scrub |
| 6 | Built |
| 7 | Bare Ground |
| 8 | Snow and Ice |

Each class has an associated RGB visualization color defined in `consts.py`.

### Segmentation Mask Generation

For each acquired satellite image, the corresponding Dynamic World label image is converted into a color-coded segmentation mask.

These masks provide pixel-level annotations that can subsequently be processed into polygon-based segmentation labels.

### Bounding Box and Polygon Extraction

`boundingBoxCreator.py` processes the generated segmentation masks using OpenCV.

Its workflow includes:

1. Converting mask images into HSV color space.
2. Identifying individual land-cover classes using predefined HSV thresholds.
3. Extracting external contours using `cv2.findContours()`.
4. Approximating contours using `cv2.approxPolyDP()`.
5. Filtering small regions based on contour area.
6. Normalizing polygon coordinates relative to image dimensions.
7. Writing segmentation annotations to text files.

The resulting annotations are structured for polygon-based object segmentation.

## 3. YOLO26 MLX Model

The repository includes a YOLO26 implementation using Apple's MLX framework.

The implementation is designed to support machine-learning workloads on Apple Silicon without requiring NVIDIA CUDA.

### Supported Tasks

| Task | Description |
|---|---|
| Detection | Object detection |
| Segmentation | Instance segmentation |
| Pose Estimation | Keypoint detection |
| Oriented Bounding Boxes | Rotated object detection |
| Tracking | Multi-object tracking |

### Model Capabilities

The implementation supports:

- Model training and validation
- Image and video inference
- PyTorch checkpoint conversion
- MLX-native model execution
- Multi-object tracking
- Segmentation and pose-estimation workflows

The package includes a command-line interface and a Python API.

## Repository Structure

```text
veritasEEpipeline/
│
├── imageLoading.py
│   └── Satellite imagery acquisition
│
├── consts.py
│   └── Land-cover classes, color mappings,
│       and geographic sampling locations
│
├── boundingBoxCreator.py
│   └── Segmentation mask processing
│       and polygon annotation generation
│
├── requirements.txt
│   └── Python dependencies
│
├── pyproject.toml
│   └── Package configuration and dependencies
│
├── src/
│   └── yolo26mlx/
│       ├── engine/
│       ├── models/
│       ├── trackers/
│       ├── converters/
│       └── ...
│
├── train/
│   ├── images/
│   └── masks/
│
├── val/
│   ├── images/
│   └── masks/
│
└── data/
    └── val/
        └── labels/
```

*The directory structure above illustrates the primary components and expected dataset outputs.*

## Installation

### Requirements

- Python 3.10 or newer
- macOS with Apple Silicon for MLX functionality
- Google Earth Engine account and project
- Internet connection for satellite imagery acquisition

### 1. Clone the Repository

```bash
git clone -b model https://github.com/vikram-saraswatula/veritasEEpipeline.git

cd veritasEEpipeline
```

### 2. Create a Virtual Environment

```bash
python -m venv .venv

source .venv/bin/activate
```

### 3. Install Dependencies

```bash
python -m pip install --upgrade pip

pip install -r requirements.txt
```

The project uses the following primary dependencies:

| Dependency | Purpose |
|---|---|
| MLX | Apple Silicon machine learning |
| NumPy | Numerical computation |
| OpenCV | Image processing and contour extraction |
| Pillow | Image loading and saving |
| Earth Engine API | Satellite imagery acquisition |
| PyTorch | Model weight conversion |
| Ultralytics | YOLO-related compatibility and conversion |
| Flask | Web application functionality |

## Running the Pipeline

### Step 1: Configure Google Earth Engine

The imagery acquisition script authenticates with Google Earth Engine.

Ensure that your Earth Engine project is accessible and configured correctly.

The current implementation initializes the project using:

```python
ee.Initialize(
    project="veritasaihackathon",
    opt_url="https://earthengine-highvolume.googleapis.com"
)
```

Update the project identifier if using a different Earth Engine project.

### Step 2: Generate Satellite Images

Run:

```bash
python imageLoading.py
```

The script generates satellite imagery and corresponding Dynamic World masks.

Generated files are organized into training and validation directories.

### Step 3: Generate Segmentation Annotations

Run:

```bash
python boundingBoxCreator.py
```

This processes the validation masks and writes polygon-based annotations.

The current annotation script is configured around the validation directory; adapt its paths and processing logic when generating annotations for the complete training dataset.

### Step 4: Model Development

The YOLO26 MLX implementation exposes a command-line interface for training, validation, inference, and tracking.

For example:

```bash
yolo26 info --model models/yolo26n.npz
```

The package also supports Python-based model usage:

```python
from yolo26mlx import YOLO

model = YOLO("models/yolo26n.npz")

results = model.predict(
    source="example.png",
    conf=0.25,
    imgsz=640
)
```

A dataset configuration file compatible with the selected YOLO task is required for training.

## Configuration

Several parameters can be adjusted depending on the desired dataset size and geographic coverage.

In `imageLoading.py`:

```python
NUM_IMAGES = 15000
WORKERS = 32
SIZE = 512
SCALE = 10
JITTER_DEG = 0.15
MAX_CLOUD = 20
VAL_EVERY = 5
```

These parameters control the number of images requested, parallel processing, image dimensions, spatial resolution, sampling variation, cloud filtering, and dataset splitting.

In `consts.py`, geographic sampling locations and land-cover color mappings can be modified or extended.

## Limitations and Future Development

Potential areas for further development include:

- Expanding geographic sampling to improve regional representation.
- Incorporating additional satellite imagery sources and spectral bands.
- Improving cloud and atmospheric artifact filtering.
- Generating segmentation annotations for both training and validation datasets.
- Developing automated dataset quality-control procedures.
- Integrating model predictions with geographic coordinates.
- Evaluating segmentation performance across different geographic and environmental conditions.
- Supporting temporal comparisons to analyze land-cover changes.

## License

The YOLO26 MLX package configuration specifies the GNU Affero General Public License v3.0 (AGPL-3.0-only).

Review the licensing terms of individual dependencies and external datasets before redistribution or commercial use.

## Acknowledgements

This project builds upon publicly available geospatial datasets and machine-learning frameworks, including:

- [Google Earth Engine](https://earthengine.google.com/)
- [Sentinel-2](https://dataspace.copernicus.eu/)
- [Google Dynamic World](https://dynamicworld.app/)
- [Apple MLX](https://github.com/ml-explore/mlx)
- [Ultralytics](https://github.com/ultralytics/ultralytics)

---

**Repository:** [vikram-saraswatula/veritasEEpipeline](https://github.com/vikram-saraswatula/veritasEEpipeline)

**Branch:** `model`
