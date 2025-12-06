export function Skeleton({ className }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-[#1A1A1A] rounded-md ${className}`} />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="w-full aspect-square rounded-2xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="w-full aspect-square rounded-2xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b border-gray-50 dark:border-white/5 last:border-0">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ChatDetailSkeleton() {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-black">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-white/10">
        <Skeleton className="w-6 h-6 rounded-full" /> {/* Back button */}
        <Skeleton className="w-10 h-10 rounded-full" /> {/* Avatar */}
        <div className="flex flex-col gap-1 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="w-8 h-8 rounded-md" /> {/* Listing Image */}
      </div>

      {/* Messages Skeleton */}
      <div className="flex-1 p-3 flex flex-col gap-4 overflow-hidden">
        <div className="flex justify-start">
          <Skeleton className="h-10 w-2/3 rounded-2xl rounded-bl-none" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-16 w-3/4 rounded-2xl rounded-br-none" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-8 w-1/2 rounded-2xl rounded-bl-none" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-2/3 rounded-2xl rounded-br-none" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-20 w-3/4 rounded-2xl rounded-bl-none" />
        </div>
      </div>

      {/* Input Skeleton */}
      <div className="p-3 border-t border-gray-100 dark:border-white/10">
        <Skeleton className="h-11 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function CreateListingSkeleton() {
  return (
    <div className="w-full max-w-xl mx-auto mt-4 px-3">
       <div className="bg-[#F2F3F7] dark:bg-white/5 rounded-2xl p-3 flex flex-col gap-4">
        {/* Photos */}
        <Skeleton className="h-32 w-full rounded-2xl" />

        {/* Buttons */}
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>
      </div>
    </div>
  );
}
