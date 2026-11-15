let cursorUrl: string | null = null;

export function setSatelliteCursor(url: string) {
  if (url) cursorUrl = url;
}

export function satelliteCursor() {
  if (cursorUrl) return cursorUrl;
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.translate(48, 50);
  ctx.rotate(-0.42);

  ctx.fillStyle = "rgba(4, 10, 20, 0.35)";
  ctx.beginPath();
  ctx.ellipse(2, 16, 28, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const shadePanel = (x: number, y: number, w: number, h: number) => {
    const face = ctx.createLinearGradient(x, y, x + w, y + h);
    face.addColorStop(0, "#8eb7ee");
    face.addColorStop(0.18, "#1d4e96");
    face.addColorStop(0.55, "#16386e");
    face.addColorStop(1, "#071428");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.moveTo(x + 3, y);
    ctx.lineTo(x + w, y + 2);
    ctx.lineTo(x + w - 2, y + h);
    ctx.lineTo(x, y + h - 2);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(214, 232, 255, 0.45)";
    ctx.lineWidth = 0.7;
    for (let i = 1; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x, y + (h / 4) * i);
      ctx.lineTo(x + w, y + (h / 4) * i + 1);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y);
    ctx.lineTo(x + w * 0.48, y + h);
    ctx.stroke();
    const sheen = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
    sheen.addColorStop(0, "rgba(255,255,255,0.28)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, w * 0.45, h);
    ctx.restore();
  };

  shadePanel(-16, -34, 32, 22);
  shadePanel(-16, 10, 32, 22);

  ctx.fillStyle = "#9aa8b8";
  ctx.fillRect(-2.2, -12, 4.4, 22);

  const body = ctx.createLinearGradient(-18, -8, 22, 10);
  body.addColorStop(0, "#f4f8fc");
  body.addColorStop(0.35, "#d5dee8");
  body.addColorStop(0.72, "#8ea0b4");
  body.addColorStop(1, "#4d5d70");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-18, -8, 36, 16, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-2, -4.2, 10, 2.2, -0.15, 0, Math.PI * 2);
  ctx.fill();
  const foil = ctx.createLinearGradient(-4, -4, 10, 4);
  foil.addColorStop(0, "#f0d48a");
  foil.addColorStop(1, "#a67c32");
  ctx.fillStyle = foil;
  ctx.fillRect(-4, -3.4, 14, 6.6);

  ctx.fillStyle = "#e7eef6";
  ctx.beginPath();
  ctx.ellipse(20, -1, 7.5, 5.4, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6d8094";
  ctx.lineWidth = 1;
  ctx.stroke();
  const dish = ctx.createRadialGradient(21, -2, 1, 21, -1, 6);
  dish.addColorStop(0, "#1a2430");
  dish.addColorStop(1, "#314252");
  ctx.fillStyle = dish;
  ctx.beginPath();
  ctx.ellipse(21, -1, 3.1, 2.2, 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f2f6fb";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-16, -1);
  ctx.lineTo(-26, -12);
  ctx.stroke();
  ctx.fillStyle = "#f2f6fb";
  ctx.beginPath();
  ctx.arc(-26, -12, 1.6, 0, Math.PI * 2);
  ctx.fill();

  cursorUrl = canvas.toDataURL("image/png");
  return cursorUrl;
}
