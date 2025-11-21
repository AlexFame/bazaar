import React from "react";

export function Skeleton({ className }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Image placeholder */}
      <Skeleton className="w-full aspect-square rounded-2xl" />
      
      {/* Title placeholder */}
      <Skeleton className="h-4 w-3/4 mt-1" />
      
      {/* Price placeholder */}
      <Skeleton className="h-4 w-1/3" />
      
      {/* Location placeholder */}
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="w-full flex justify-center mt-3">
      <div className="w-full max-w-[520px] px-3">
        {/* Back button */}
        <Skeleton className="w-20 h-8 rounded-full mb-3" />
        
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          {/* Gallery */}
          <Skeleton className="w-full aspect-[4/3] rounded-2xl mb-4" />
          
          {/* Category */}
          <Skeleton className="h-3 w-1/4 mb-2" />
          
          {/* Title */}
          <Skeleton className="h-6 w-3/4 mb-2" />
          
          {/* Price */}
          <Skeleton className="h-6 w-1/3 mb-4" />
          
          {/* Description */}
          <div className="space-y-2 mb-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          
          {/* Location */}
          <Skeleton className="h-3 w-1/2 mb-4" />
          
          {/* Buttons */}
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-10 rounded-full" />
            <Skeleton className="flex-1 h-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
