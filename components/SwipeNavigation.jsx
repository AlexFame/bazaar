"use client";

import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function SwipeNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const touchStartRef = useRef(null);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  
  // Configuration
  const TRIGGER_THRESHOLD = 100; // px to trigger back
  const MAX_VERTICAL_DEVIATION = 60;
  
  useEffect(() => {
    if (pathname === '/') return;

    const container = document.querySelector('.telegram-container');
    if (!container) return; // Should exist

    const handleTouchStart = (e) => {
      // Ignore if multi-touch
      if (e.touches.length > 1) return;

      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        target: e.target,
        timestamp: Date.now()
      };
      isDraggingRef.current = false;
      currentXRef.current = 0;
    };

    const handleTouchMove = (e) => {
      try {
        if (!touchStartRef.current) return;

        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        const deltaX = x - touchStartRef.current.x;
        const deltaY = y - touchStartRef.current.y;

        // 1. Check intent if not yet dragging
        if (!isDraggingRef.current) {
          // Must be moving Right
          if (deltaX < 0) return; // moving left

          // Must be mostly horizontal
          if (Math.abs(deltaY) > Math.abs(deltaX)) {
               // Vertical scroll intent, ignore this gesture
               touchStartRef.current = null;
               return;
          }
          
          // Check for scrollable containers
          if (Math.abs(deltaX) > 10) { // small buffer
             if (isTouchInScrollable(touchStartRef.current.target, deltaX)) {
                 // Inside scrollable, ignore
                 touchStartRef.current = null; 
                 return;
             }
             // Start dragging!
             isDraggingRef.current = true;
          }
        }

        if (isDraggingRef.current && deltaX > 0) {
          if (e.cancelable) e.preventDefault(); // Prevent scrolling while dragging horizontally
          currentXRef.current = deltaX;
          
          // Apply transform
          container.style.transform = `translateX(${deltaX}px)`;
          container.style.transition = 'none';
          
          // Visual opacity fade
          container.style.opacity = `${1 - (deltaX / window.innerWidth) * 0.5}`;
        }
      } catch (err) {
        console.error("Swipe move error:", err);
        touchStartRef.current = null;
        isDraggingRef.current = false;
      }
    };

    const handleTouchEnd = (e) => {
      try {
        if (!touchStartRef.current) return;
        
        const deltaX = currentXRef.current;
        
        if (isDraggingRef.current) {
           // Released
           if (deltaX > TRIGGER_THRESHOLD) {
               // Trigger Back
               if (navigator.vibrate) navigator.vibrate(15);
               
               // Animate out
               container.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
               container.style.transform = `translateX(100%)`;
               container.style.opacity = '0';
               
               setTimeout(() => {
                   router.back();
               }, 200);
            } else {
                // Snap back
                container.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
                container.style.transform = '';
                container.style.opacity = '1';
            }
        }
      } catch (err) {
        console.error("Swipe end error:", err);
      } finally {
        touchStartRef.current = null;
        isDraggingRef.current = false;
        currentXRef.current = 0;
      }
    };
    
    // Helper
    const isTouchInScrollable = (target, deltaX) => {
      let current = target instanceof Element ? target : target.parentElement;
      while (current && current !== document.body && current !== container) {
        const style = window.getComputedStyle(current);
        const overflowX = style.overflowX;
        if (overflowX === 'scroll' || overflowX === 'auto') {
           if (current.scrollWidth > current.clientWidth) {
              // If swiping Right (deltaX > 0), block if scrollLeft > 0
              if (current.scrollLeft > 0) return true;
           }
        }
        current = current.parentElement;
      }
      return false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true }); // Passive true to allow scrolling
    // Touchmove cannot be passive false if we want to preventDefault?
    // Actually we want to preventDefault only if dragging. 
    // Attaching dynamic listener is complex.
    // Let's us passive: false for touchmove to allow preventing scroll
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      
      // Cleanup visual state
      container.style.transform = '';
      container.style.opacity = '';
      container.style.transition = '';
    };
  }, [pathname, router]);

  // Reset styles immediately on path change or search params change
  useEffect(() => {
      const container = document.querySelector('.telegram-container');
      if (container) {
          container.style.transform = '';
          container.style.opacity = '';
          container.style.transition = '';
      }
  }, [pathname, searchParams]);

  return null;
}
