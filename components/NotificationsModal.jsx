"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";

export default function NotificationsModal({ isOpen, onClose }) {
  const { t } = useLang();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    loadNotifications();

    let channel;
    
    async function subscribe() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        channel = supabase
            .channel('realtime:modal_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    // Prepend new notification
                    setNotifications(prev => [payload.new, ...prev]);
                    // Mark as read immediately if modal is open? 
                    // Maybe better to just show it as unread or read.
                    // Let's keep it simple: Add it to list.
                }
            )
            .subscribe();
    }
    
    subscribe();

    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, [isOpen]);

  async function handleNotificationClick(notification) {
      // Mark as read if not already
      if (!notification.is_read) {
          try {
              // Use API to mark as read
              await fetch('/api/notifications', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: notification.id })
              });
              
              // Update local state
              setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
              
              // Also update Supabase cache/realtime triggers might handle it, but local update is instant
          } catch (e) {
              console.error("Error marking read:", e);
          }
      }

      onClose(); // Close modal

      // Navigate based on type
      if (notification.type === 'new_comment' || notification.type === 'offer') {
          if (notification.data?.listing_id) {
              window.location.href = `/listing/${notification.data.listing_id}`;
          }
      } else if (notification.type === 'msg') {
          // If we had conversation_id
          window.location.href = `/messages`;
      }
      // General fallbacks
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          // Try Telegram user
          const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
          if (tgUser?.id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("tg_user_id", tgUser.id)
                .single();
              
              if (profile) {
                user = { id: profile.id }; // Mock user object for query
              }
          }
      }

      if (!user) {
          setLoading(false);
          return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
      
      // Removed auto-mark-read on open, doing it on click or just leaving it.
      // Or maybe mark all as read?
      // User requested "I don't see where question is". 
      // Let's NOT mark all read instantly, let them see unread state in list.
      
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-md h-[80vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-slide-up sm:animate-zoom-in" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-lg font-bold">{t("notifications_title") || "Уведомления"}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
             ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && <div className="text-center py-4 text-gray-500">Загрузка...</div>}
            
            {!loading && notifications.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    {t("no_notifications") || "Нет новых уведомлений"}
                </div>
            )}
            
            {notifications.map(n => (
                <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-all ${n.is_read ? 'bg-white dark:bg-black/20 border-gray-100 dark:border-white/5' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800'}`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{t(n.title) || n.title || t("notification_default") || "Уведомление"}</span>
                        <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">{n.message}</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
