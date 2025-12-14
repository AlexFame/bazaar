"use client";

import { useLang } from "@/lib/i18n-client";

export default function ReviewList({ reviews }) {
  const { t } = useLang();

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        {t("no_reviews") || "Отзывов пока нет"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden relative">
                {review.reviewer?.avatar_url && review.reviewer.avatar_url.startsWith("http") ? (
                  <Image
                    src={review.reviewer.avatar_url}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                    {(review.reviewer?.full_name || review.reviewer?.tg_username || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-bold">
                  {review.reviewer?.full_name || review.reviewer?.tg_username || t("user_default") || "Пользователь"}
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex text-yellow-400 text-xs">
              {[...Array(5)].map((_, i) => (
                <span key={i}>{i < review.rating ? "★" : "☆"}</span>
              ))}
            </div>
          </div>
          {review.comment && (
            <p className="text-sm text-gray-700">{review.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}
