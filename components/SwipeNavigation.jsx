"use client";

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SwipeNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const touchStartRef = useRef(null);
  
  // Configuration
  const MIN_SWIPE_DISTANCE = 70; // Reduced triggers threshold
  const MAX_VERTICAL_DEVIATION = 60; // Allowed vertical drift

  useEffect(() => {
    // Disable on root page (Home) - can't go back from home
    if (pathname === '/') return;

    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
        target: e.target,
        timestamp: Date.now()
      };
    };

    const handleTouchEnd = (e) => {
      if (!touchStartRef.current) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        timestamp: Date.now()
      };

      const deltaX = touchEnd.x - touchStartRef.current.x;
      const deltaY = touchEnd.y - touchStartRef.current.y;
      const timeDiff = touchEnd.timestamp - touchStartRef.current.timestamp;

      // Logic:
      // 1. Must be a Right Swipe (positive deltaX)
      // 2. Must be greater than threshold
      // 3. Must be mostly horizontal (deltaY within limits)
      // 4. Must not be a clear scroll gesture (slow diagonal drift) -> optional check
      // 5. Must not start inside a horizontally scrollable container (unless at start)

      const isRightSwipe = deltaX > MIN_SWIPE_DISTANCE;
      const isHorizontal = Math.abs(deltaY) < MAX_VERTICAL_DEVIATION;
      // const isQuick = timeDiff < 500; // Optional speed check

      if (isRightSwipe && isHorizontal) {
        // Check for Horizontal Scroll Containers
        if (isTouchInScrollable(touchStartRef.current.target, deltaX)) {
             // Example: Image Carousel, Horizontal Category List
             // If I'm scrolling the carousel, don't go back.
             // But if I'm at the start of the carousel (scrollLeft === 0), maybe allow it?
             // Standard behavior: if scrollable, consume the event.
             console.log("Swipe ignored: inside scrollable container");
             return;
        }

        // Trigger Back
         if (navigator.vibrate) navigator.vibrate(15);
         router.back();
      }

      touchStartRef.current = null;
    };

    // Helper: Check if the touch target is inside a horizontally scrollable element
    const isTouchInScrollable = (target, deltaX) => {
      let current = target;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const overflowX = style.overflowX;
        
        // Check if element is horizontally scrollable
        if (overflowX === 'scroll' || overflowX === 'auto') {
           // Does it actually have scrollable content?
           if (current.scrollWidth > current.clientWidth) {
               // If swiping RIGHT (deltaX > 0), we only block if user CAN scroll LEFT (i.e., scrollLeft > 0)
               // If scrollLeft is 0, user is at the edge, so we can allow the BACK gesture.
               if (current.scrollLeft > 0) {
                   return true; // Consume event, don't trigger back
               }
           }
        }
        current = current.parentElement;
      }
      return false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pathname, router]);

  return null;
}
