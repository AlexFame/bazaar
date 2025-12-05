"use client";

import { useState } from "react";
import Image from "next/image";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function ListingGallery({ imageUrls, isFavorite, onToggleFavorite }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  function handleScroll(e) {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const index = Math.round(scrollLeft / width);

    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  }

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="relative mb-3">
        <FavoriteButton isFavorite={isFavorite} onClick={onToggleFavorite} />
        
        <div className="w-full bg-gray-100 rounded-2xl overflow-hidden relative h-[300px] flex items-center justify-center">
          <svg
            className="w-16 h-16 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <FavoriteButton isFavorite={isFavorite} onClick={onToggleFavorite} />

        <div
          className="w-full flex gap-3 overflow-x-auto pb-2 no-scrollbar"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
          onScroll={handleScroll}
        >
          {imageUrls.map((url, i) => (
            <div 
              key={i}
              className="w-full flex-shrink-0 cursor-pointer bg-gray-50 rounded-2xl overflow-hidden relative h-[300px]"
              style={{ scrollSnapAlign: "center" }}
              onClick={() => {
                setCurrentIndex(i);
                setIsLightboxOpen(true);
              }}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 520px"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88/7dfwAIuQNS4g0U2AAAAABJRU5ErkJggg==" // grey-ish
              />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {imageUrls.length > 1 && (
        <div className="flex justify-center gap-2 mt-2 mb-3">
          {imageUrls.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex ? "bg-black" : "bg-black/20"
              }`}
            />
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            className="absolute top-4 right-4 text-white p-2 z-50"
            onClick={() => setIsLightboxOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="relative w-full h-full flex items-center justify-center">
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit
              doubleClick={{ disabled: false, mode: "toggle" }}
              pinch={{ disabled: true }}
            >
              {({ zoomIn, zoomOut, resetTransform, state }) => (
                <TransformComponent
                  wrapperClass="!w-full !h-full flex items-center justify-center"
                  contentClass="!w-full !h-full flex items-center justify-center"
                >
                  <div 
                    className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center"
                    onClick={(e) => {
                      if (state.scale === 1) {
                        e.stopPropagation();
                        setIsLightboxOpen(false);
                      }
                    }}
                  >
                    <Image
                      src={imageUrls[currentIndex]}
                      alt="Full size"
                      fill
                      className="object-contain"
                      sizes="100vw"
                    />
                  </div>
                </TransformComponent>
              )}
            </TransformWrapper>
            
            {imageUrls.length > 1 && (
              <>
                <button 
                    className="absolute left-2 text-white p-2 bg-black/20 rounded-full hover:bg-black/40 z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button 
                    className="absolute right-2 text-white p-2 bg-black/20 rounded-full hover:bg-black/40 z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FavoriteButton({ isFavorite, onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorite ? "#ef4444" : "none"}
        stroke={isFavorite ? "#ef4444" : "currentColor"}
        strokeWidth="2"
        className="w-5 h-5 text-black"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    </button>
  );
}
