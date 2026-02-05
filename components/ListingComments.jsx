"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { validateComment } from "@/lib/moderation";
import { useLang } from "@/lib/i18n-client";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function ListingComments({ listingId, ownerId }) {
  const { t } = useLang();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const [canPost, setCanPost] = useState(false);

  useEffect(() => {
    // Check current user
    async function checkUser() {
        // 1. Try Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) {
                setCurrentUser(data);
                setCanPost(true);
                return;
            }
        }
        
        // 2. Try Telegram Auth (initData)
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
             setCanPost(true);
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
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const initData = tg?.initData;

    // Fallback: if no initData and no user, return
    if ((!newComment.trim() || !currentUser) && !initData) return;

    // Validate comment
    const validation = validateComment(newComment);
    if (!validation.valid) {
      alert(t(validation.errorKey) || validation.error);
      return;
    }

    setSubmitting(true);
    try {
      // Use API Route for robust auth
      const res = await fetch('/api/comments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              initData,
              listingId,
              content: newComment.trim()
          })
      });

      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to post comment");
      }

      setNewComment("");
      loadComments();
      
      // Client-side notification logic preserved (optional)
      // ...
      
    } catch (err) {
      console.error("Error posting comment:", err);
      alert(t("send_comment_error") || "Не удалось отправить комментарий"); 
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId) {
    if (!confirm(t("confirm_delete_comment") || "Удалить комментарий?")) return;

    try {
      const { error } = await supabase
        .from("listing_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      loadComments();
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert(t("delete_comment_error") || "Не удалось удалить комментарий");
    }
  }

  function handleReply(comment) {
      if (!comment || !comment.profiles) return;
      const username = comment.profiles.full_name || comment.profiles.tg_username || "User";
      setNewComment(`@${username}, `);
      // Ideally focus input
      document.getElementById("comment-input")?.focus();
  }

  async function handleEdit(commentId) {
    if (!editContent.trim()) return;

    const validation = validateComment(editContent);
    if (!validation.valid) {
      alert(t(validation.errorKey) || validation.error);
      return;
    }

    try {
      const { error } = await supabase
        .from("listing_comments")
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
        .eq("id", commentId);

      if (error) throw error;
      setEditingId(null);
      setEditContent("");
      loadComments();
    } catch (err) {
      console.error("Error updating comment:", err);
      alert(t("update_comment_error") || "Не удалось обновить комментарий");
    }
  }

  if (loading) return <div className="py-4 text-center text-gray-500 text-xs">{t("loadingMore") || "Загрузка..."}</div>;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold mb-3">{t("questions_title") || "Вопросы и обсуждение"} ({comments.length})</h3>

      {/* List */}
      <div className="space-y-4 mb-4">
        {comments.length === 0 && (
            <p className="text-xs text-gray-400 italic">{t("no_questions") || "Пока нет вопросов. Будьте первым!"}</p>
        )}
        
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden relative">
                {comment.profiles?.avatar_url ? (
                    <Image src={comment.profiles.avatar_url} alt="Avatar" fill className="object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {(comment.profiles?.full_name || comment.profiles?.tg_username || "U")[0].toUpperCase()}
                    </div>
                )}
            </div>
            <div className="flex-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold">
                        {comment.profiles?.full_name || comment.profiles?.tg_username || (t("user_default") || "Пользователь")}
                    </span>
                    {comment.user_id === ownerId && (
                        <span className="text-[10px] bg-black text-white px-1.5 rounded-sm">{t("seller_badge") || "Продавец"}</span>
                    )}
                    <span className="text-[10px] text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                </div>
                
                {editingId === comment.id ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                      autoFocus
                    />
                    <button onClick={() => handleEdit(comment.id)} className="text-xs text-green-600">✓</button>
                    <button onClick={() => { setEditingId(null); setEditContent(""); }} className="text-xs text-red-600">✕</button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-800 mt-0.5">{comment.content}</p>
                    {currentUser?.id === comment.user_id ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                          className="text-base text-gray-400 hover:text-black p-1"
                        >
                          ✎
                        </button>
                        <button 
                          onClick={() => handleDelete(comment.id)}
                          className="text-base text-gray-400 hover:text-red-600 p-1"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                        currentUser?.id === ownerId && (
                            <button 
                                onClick={() => handleReply(comment)}
                                className="text-xs text-blue-600 font-medium hover:underline p-1"
                            >
                                Ответить
                            </button>
                        )
                    )}
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {canPost ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                id="comment-input"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t("ask_placeholder") || "Задайте вопрос продавцу..."}
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
            {t("login_to_ask") || "Войдите через Telegram, чтобы задать вопрос."}
        </div>
      )}
    </div>
  );
}
