from ultralytics import YOLO

# Load pretrained segmentation weights
model = YOLO("models/yolo26m-seg.pt")

# Train on COCO128-Seg (auto-downloaded, ~7 MB, 128 images with polygon labels)
results = model.train(
    data="./configs/config.yaml",    # dataset name or path to data YAML
    epochs=25,
    batch=64,
    imgsz=512,
    project="runs/train",
    name="gaia",
    patience=7,
    workers=8,
    device="mps",
)
