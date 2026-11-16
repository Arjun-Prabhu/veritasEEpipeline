import torch
import torch.nn as nn
import torch.nn.functional as F

class DumbYOLOSeg(nn.Module):

    def __init__(self, num_classes=1):
        super().__init__()
        self.num_classes = num_classes
        # Dummy parameter so optimizers/device checks (.to('cuda')) don't fail
        self.dummy_param = nn.Parameter(torch.zeros(1))

    def forward(self, x):

        batch_size, _, height, width = x.shape
        device = x.device

        # 1. Bounding box covering the whole image: [x1, y1, x2, y2] = [0, 0, 1, 1]
        boxes = torch.tensor([[[0.0, 0.0, 1.0, 1.0]]], device=device).repeat(batch_size, 1, 1)

        # 2. Confidence score = 1.0 (100%)
        scores = torch.ones((batch_size, 1), device=device)

        # 3. Class ID = 0
        classes = torch.zeros((batch_size, 1), dtype=torch.long, device=device)

        # 4. Segmentation mask covering every pixel (all 1s)
        masks = torch.ones((batch_size, 1, height, width), dtype=torch.float32, device=device)

        return {
            "boxes": boxes,
            "scores": scores,
            "classes": classes,
            "masks": masks
        }


from ultralytics.engine.results import Results


def predict_ultralytics_format(orig_img):
    h, w = orig_img.shape[:2]

    boxes_data = torch.tensor([[0.0, 0.0, float(w), float(h), 1.0, 0.0]])

    masks_data = torch.ones((1, h, w), dtype=torch.float32)

    result = Results(
        orig_img=orig_img,
        path="dummy.jpg",
        names={0: "everything"},
        boxes=boxes_data,
        masks=masks_data
    )
    return [result]

# Usage:
# results = predict_ultralytics_format(img)
# annotated_frame = results[0].plot()
