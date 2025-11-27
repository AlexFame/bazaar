"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

export default function ListingComments({ listingId, ownerId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check current user
    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            setCurrentUser(data);
        }
    }
    checkUser();
    loadComments();
  }, [listingId]);

  async function loadComments() {
    try {
      const { data, error } = await supabase
        .from("listing_comments")
        .select("*, profiles:user_id(*)")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("listing_comments")
        .insert({
          listing_id: listingId,
          user_id: currentUser.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      loadComments();
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Не удалось отправить комментарий: " + (err.message || "Неизвестная ошибка"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-4 text-center text-gray-500 text-xs">Загрузка комментариев...</div>;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold mb-3">Вопросы и обсуждение ({comments.length})</h3>

      {/* List */}
      <div className="space-y-4 mb-4">
        {comments.length === 0 && (
            <p className="text-xs text-gray-400 italic">Пока нет вопросов. Будьте первым!</p>
        )}
        
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden relative">
                {comment.profiles?.avatar_url ? (
                    <Image src={comment.profiles.avatar_url} alt="Avatar" fill className="object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {(comment.profiles?.username || "U")[0].toUpperCase()}
                    </div>
                )}
            </div>
            <div className="flex-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold">
                        {comment.profiles?.username || "Пользователь"}
                    </span>
                    {comment.user_id === ownerId && (
                        <span className="text-[10px] bg-black text-white px-1.5 rounded-sm">Продавец</span>
                    )}
                    <span className="text-[10px] text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                </div>
                <p className="text-xs text-gray-800 mt-0.5">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Задайте вопрос продавцу..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-black"
                disabled={submitting}
            />
            <button 
                type="submit" 
                disabled={submitting || !newComment.trim()}
                className="bg-black text-white rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-50"
            >
                ➤
            </button>
        </form>
      ) : (
        <div className="bg-gray-50 rounded-lg p-3 text-center text-xs text-gray-500">
            Войдите через Telegram, чтобы задать вопрос.
        </div>
      )}
    </div>
  );
}
