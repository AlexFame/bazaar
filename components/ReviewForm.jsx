"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTelegramUser } from "@/lib/telegram";
import { validateComment } from "@/lib/moderation";

export default function ReviewForm({ targetUserId, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    
    const tgUser = getTelegramUser();
    if (!tgUser) {
      alert("Пожалуйста, войдите через Telegram, чтобы оставить отзыв.");
      return;
    }

    setSubmitting(true);
    try {
      // Get reviewer profile
      const { data: reviewerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("tg_user_id", tgUser.id)
        .single();

      if (!reviewerProfile) {
        alert("Профиль не найден. Пожалуйста, создайте профиль.");
        return;
      }

      // Prevent self-review
      if (reviewerProfile.id === targetUserId) {
        alert("Вы не можете оставить отзыв самому себе.");
        return;
      }

      // Validate comment if provided
      if (comment.trim()) {
        const validation = validateComment(comment);
        if (!validation.valid) {
          alert(validation.error);
          return;
        }
      }

      // Insert review
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: reviewerProfile.id,
        target_id: targetUserId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;
      
      // Notify the target user (seller)
      try {
          await fetch("/api/notifications/telegram", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  recipientId: targetUserId,
                  message: `⭐ Новый отзыв! Пользователь поставил оценку ${rating}/5: "${comment.trim() || "Без комментария"}"`,
                  type: "review"
              })
          });
      } catch (notifyErr) {
          console.error("Failed to send review notification:", notifyErr);
      }

      alert("Отзыв успешно добавлен!");
      setComment("");
      setRating(5);
      
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Ошибка при добавлении отзыва.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
      <h3 className="text-sm font-bold mb-3">Оставить отзыв</h3>
      
      {/* Rating */}
      <div className="mb-3">
        <label className="text-xs text-gray-600 mb-1 block">Оценка</label>
        <div className="flex gap-1 text-2xl">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`transition-colors ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-3">
        <label className="text-xs text-gray-600 mb-1 block">Комментарий (необязательно)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          rows={3}
          placeholder="Расскажите о вашем опыте..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
      >
        {submitting ? "Отправка..." : "Отправить отзыв"}
      </button>
    </form>
  );
}
