import torch
from ultralytics.utils import ops
from ultralytics.utils.plotting import Annotator, colors


def masks_no_blend(self, masks, colors, alpha: float = 0.5):
    if not len(masks):
        return
    if isinstance(masks, torch.Tensor):
        tensor_image = isinstance(self.im, torch.Tensor)
        device = self.im.device if tensor_image else masks.device
        masks = ops.scale_masks(masks[None].to(device).float(), self.im.shape[:2])[0] > 0.5  # (n,h,w)
        cols = torch.tensor(colors, device=device, dtype=torch.float32) / 255.0             # (n,3) BGR
        covered = masks.any(0, keepdim=False).unsqueeze(-1).float() * alpha                  # (h,w,1)
        first = masks.to(torch.uint8).argmax(0)          # first (= highest-conf) mask covering each pixel
        color_map = cols[first]                           # (h,w,3)
        im = (self.im if tensor_image else torch.from_numpy(self.im)).to(device).float() / 255.0
        im = ((im * (1 - covered) + color_map * covered) * 255).byte()
        self.im[:] = im if tensor_image else im.cpu().numpy()
    else:  # numpy path: paint in reverse so the first (highest-conf) mask ends on top
        import cv2, numpy as np
        self._to_numpy()
        overlay = self.im.copy()
        for i in reversed(range(len(masks))):
            overlay[masks[i].astype(bool)] = colors[i]
        hit = np.any(masks.astype(bool), 0)
        blended = cv2.addWeighted(self.im, 1 - alpha, overlay, alpha, 0)
        self.im[hit] = blended[hit]



