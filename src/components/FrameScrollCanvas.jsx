import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TOTAL_FRAMES } from '../utils/frames';

export default function FrameScrollCanvas({ images }) {
  const canvasRef = useRef(null);
  const currentFrameRef = useRef(0);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Draw frame on canvas with high-DPI scaling and responsive cover fitting
  const drawFrame = useCallback(
    (frameIndex) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const img = images && images[frameIndex];
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep dark background fill
      ctx.fillStyle = '#060b08';
      ctx.fillRect(0, 0, width, height);

      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const imgAspect = imgW / imgH;
      const screenAspect = width / height;

      let drawW, drawH, drawX, drawY;

      // Object-fit: cover, centered on stage
      if (screenAspect > imgAspect) {
        // Widescreen / desktop
        drawW = width;
        drawH = width / imgAspect;
        drawX = 0;
        drawY = (height - drawH) * 0.45;
      } else {
        // Portrait / mobile
        drawH = height;
        drawW = height * imgAspect;
        drawX = (width - drawW) / 2;
        drawY = 0;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      ctx.restore();
    },
    [images]
  );

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      drawFrame(currentFrameRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame]);

  // Initial draw
  useEffect(() => {
    if (images && images.length > 0) {
      drawFrame(0);
    }
  }, [images, drawFrame]);

  // Pure scroll/swipe frame scrubbing up to frame 168, then freeze
  useEffect(() => {
    let touchStartY = 0;
    let accumulatedDelta = 0;
    const SENSITIVITY = 14;

    const updateFrameByDelta = (deltaY) => {
      accumulatedDelta += deltaY;
      const frameStep = Math.trunc(accumulatedDelta / SENSITIVITY);

      if (frameStep !== 0) {
        accumulatedDelta -= frameStep * SENSITIVITY;

        setCurrentFrame((prev) => {
          // If already at final frame (168) and scrolling down, freeze and reset delta
          if (prev === TOTAL_FRAMES - 1 && frameStep > 0) {
            accumulatedDelta = 0;
            return prev;
          }
          // If already at first frame (01) and scrolling up, reset delta
          if (prev === 0 && frameStep < 0) {
            accumulatedDelta = 0;
            return prev;
          }

          const next = Math.max(0, Math.min(TOTAL_FRAMES - 1, prev + frameStep));
          if (next !== currentFrameRef.current) {
            currentFrameRef.current = next;
            drawFrame(next);
          }
          return next;
        });
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();
      updateFrameByDelta(e.deltaY);
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY;
      touchStartY = currentY;
      updateFrameByDelta(deltaY);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [drawFrame]);

  const isLastFrame = currentFrame === TOTAL_FRAMES - 1;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black select-none z-10 touch-none">
      {/* Pinned Stage Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover select-none pointer-events-none"
      />

      {/* Fade-in text at last frame in normal italic bold font with reduced size */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-1000 ease-out z-20 px-4 ${
          isLastFrame
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-3'
        }`}
        style={{
          // Perfectly centered in the illuminated ivory backdrop between cross and table
          paddingBottom: '8vh',
        }}
      >
        <div className="font-serif italic font-bold text-olive-wedding flex flex-col items-center justify-center select-none text-center leading-tight">
          <div className="text-sm sm:text-base md:text-lg tracking-[0.25em] font-bold">
            FRIDAY
          </div>
          <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold my-1">
            08
          </div>
          <div className="text-sm sm:text-base md:text-lg tracking-[0.2em] font-bold">
            JANUARY 2027
          </div>
          <div className="text-xs sm:text-sm md:text-base tracking-[0.15em] font-bold mt-1">
            6:00 PM
          </div>
        </div>
      </div>
    </div>
  );
}
