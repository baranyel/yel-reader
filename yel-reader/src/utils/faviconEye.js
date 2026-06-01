const SIZE = 64;
let intervalId = null;

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function drawEye(ctx, pupilX, pupilY, blinkAmount) {
  ctx.clearRect(0, 0, SIZE, SIZE);

  const r = SIZE * 0.25;
  ctx.fillStyle = "#0F766E";
  ctx.beginPath();
  ctx.roundRect(0, 0, SIZE, SIZE, r);
  ctx.fill();

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const eyeW = SIZE * 0.64;
  const eyeH = SIZE * 0.38 * (1 - blinkAmount * 0.95);

  if (eyeH <= 0) return;

  ctx.beginPath();
  ctx.ellipse(cx, cy, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
  ctx.clip();

  const irisR = SIZE * 0.13;
  const pupilR = SIZE * 0.085;

  ctx.beginPath();
  ctx.arc(cx + pupilX, cy + pupilY, irisR, 0, Math.PI * 2);
  ctx.fillStyle = "#0d9488";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + pupilX, cy + pupilY, pupilR, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + pupilX + pupilR * 0.45, cy + pupilY - pupilR * 0.45, pupilR * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fill();

  ctx.restore();

  if (blinkAmount > 0.02) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, eyeW / 2 + 1, (SIZE * 0.38) / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    const lidH = SIZE * 0.38 * blinkAmount;
    ctx.fillStyle = "#0F766E";
    ctx.fillRect(cx - eyeW / 2 - 2, cy - (SIZE * 0.38) / 2, eyeW + 4, lidH);
    ctx.fillRect(cx - eyeW / 2 - 2, cy + (SIZE * 0.38) / 2 - lidH, eyeW + 4, lidH);
    ctx.restore();
  }
}

export function startEyeFavicon() {
  if (intervalId) return;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  const favicon = document.getElementById("favicon");
  if (!favicon) return;

  const maxOffset = SIZE * 0.095;
  let pupilX = 0, pupilY = 0;
  let targetX = 0, targetY = 0;
  let blinkAmount = 0;
  let blinkPhase = "idle";
  let blinkCooldown = rand(7, 20);
  let closedTicks = 0;
  let lookCooldown = rand(5, 17);

  intervalId = setInterval(() => {
    // --- Look: random curious roaming ---
    lookCooldown--;
    if (lookCooldown <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() < 0.15 ? 0 : rand(0.5, 1) * maxOffset;
      targetX = Math.cos(angle) * dist;
      targetY = Math.sin(angle) * dist * 0.4;
      lookCooldown = rand(5, 20);
    }
    pupilX += (targetX - pupilX) * 0.1;
    pupilY += (targetY - pupilY) * 0.1;

    // --- Blink ---
    if (blinkPhase === "idle") {
      blinkCooldown--;
      if (blinkCooldown <= 0) blinkPhase = "closing";
    } else if (blinkPhase === "closing") {
      blinkAmount = Math.min(1, blinkAmount + 0.42);
      if (blinkAmount >= 1) { blinkPhase = "closed"; closedTicks = rand(1, 3); }
    } else if (blinkPhase === "closed") {
      closedTicks--;
      if (closedTicks <= 0) blinkPhase = "opening";
    } else if (blinkPhase === "opening") {
      blinkAmount = Math.max(0, blinkAmount - 0.42);
      if (blinkAmount <= 0) { blinkPhase = "idle"; blinkCooldown = rand(7, 23); }
    }

    drawEye(ctx, pupilX, pupilY, blinkAmount);
    favicon.href = canvas.toDataURL();
  }, 50);
}

export function stopEyeFavicon() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  const favicon = document.getElementById("favicon");
  if (favicon) favicon.href = "/yel-reader/icon.svg";
}
