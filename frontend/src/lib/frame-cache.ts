import { ASSETS } from "./assets";

export const FRAME_FPS = 24;

export interface FrameCacheController {
  getTotalFrames: () => number;
  getCachedCount: () => number;
  getShownIndex: () => number;
  setWant: (index: number) => void;
  drawWant: () => void;
  resizeCanvas: () => void;
  destroy: () => void;
}

export function createFrameCache(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  onReadyChange?: (cached: number, total: number) => void
): FrameCacheController {
  let NF = 121;
  let frames: (Blob | undefined)[] = new Array(NF);
  let cachedCount = 0;
  let want = 0;
  let shown = -1;
  let busy = false;
  let destroyed = false;

  const grab = document.createElement("canvas");
  grab.width = 1600;
  grab.height = 900;
  const gctx = grab.getContext("2d");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      shown = -1;
      drawWant();
    }
  }

  function nearestCached(target: number): number {
    if (frames[target]) return target;
    for (let k = 1; k < NF; k++) {
      if (target - k >= 0 && frames[target - k]) return target - k;
      if (target + k < NF && frames[target + k]) return target + k;
    }
    return -1;
  }

  async function drawWant() {
    if (destroyed || busy || !ctx) return;
    const idx = nearestCached(want);
    if (idx < 0 || idx === shown) return;
    const blob = frames[idx];
    if (!blob) return;

    busy = true;
    try {
      const bmp = await createImageBitmap(blob);
      if (destroyed) {
        bmp.close();
        return;
      }
      const cw = canvas.width;
      const ch = canvas.height;
      const bw = bmp.width;
      const bh = bmp.height;
      const scale = Math.max(cw / bw, ch / bh);
      const dw = bw * scale;
      const dh = bh * scale;
      const dx = (cw - dw) * 0.5;
      const dy = (ch - dh) * 0.5;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(bmp, dx, dy, dw, dh);
      bmp.close();
      shown = idx;
    } catch {
      // ignore decode errors on teardown
    } finally {
      busy = false;
      if (!destroyed && nearestCached(want) !== shown) {
        drawWant();
      }
    }
  }

  function storeFrame(index: number, quality = 0.86) {
    if (destroyed || !gctx || frames[index]) return;
    gctx.drawImage(video, 0, 0, grab.width, grab.height);
    grab.toBlob(
      (blob) => {
        if (!blob || destroyed) return;
        if (!frames[index]) {
          frames[index] = blob;
          cachedCount++;
          onReadyChange?.(cachedCount, NF);
        }
        if (index === want || shown < 0) {
          drawWant();
        }
      },
      "image/jpeg",
      quality
    );
  }

  function startCaching() {
    if (destroyed) return;
    const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 5.04;
    NF = Math.max(2, Math.round(dur * FRAME_FPS));
    frames = new Array(NF);
    cachedCount = 0;

    // Frame 0 first
    storeFrame(0, 0.9);

    const hasRVFC = typeof video.requestVideoFrameCallback === "function";
    if (hasRVFC) {
      const onFrame = (_now: number, meta: VideoFrameCallbackMetadata) => {
        if (destroyed) return;
        const i = Math.min(NF - 1, Math.round(meta.mediaTime * FRAME_FPS));
        if (i > 0 && !frames[i]) {
          storeFrame(i, 0.86);
        }
        if (!video.ended && cachedCount < NF) {
          video.requestVideoFrameCallback(onFrame);
        }
      };
      video.requestVideoFrameCallback(onFrame);
      video.play().catch(() => {});
    } else {
      // Fallback: step currentTime
      let i = 1;
      const stepNext = () => {
        if (destroyed || i >= NF) return;
        video.currentTime = Math.min(i / FRAME_FPS, dur - 0.01);
      };
      const onSeeked = () => {
        if (destroyed) return;
        storeFrame(i, 0.86);
        i++;
        if (i < NF) {
          stepNext();
        } else {
          video.removeEventListener("seeked", onSeeked);
        }
      };
      video.addEventListener("seeked", onSeeked);
      stepNext();
    }
  }

  const onLoaded = () => {
    startCaching();
  };

  if (!video.src) {
    video.src = ASSETS.flyInVideo;
  }

  if (video.readyState >= 2) {
    startCaching();
  } else {
    video.addEventListener("loadeddata", onLoaded, { once: true });
  }

  resizeCanvas();

  return {
    getTotalFrames: () => NF,
    getCachedCount: () => cachedCount,
    getShownIndex: () => shown,
    setWant: (index: number) => {
      want = Math.max(0, Math.min(NF - 1, index));
    },
    drawWant,
    resizeCanvas,
    destroy: () => {
      destroyed = true;
      video.removeEventListener("loadeddata", onLoaded);
      video.pause();
    },
  };
}
