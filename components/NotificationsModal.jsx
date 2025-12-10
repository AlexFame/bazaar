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

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          // Try Telegram user
          const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
          if (tgUser) {
              // We need profile id. Assumes logged in context usually.
              // If not mapped, we can't show.
          }
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
      
      // Mark unread as read
      const unreadIds = data?.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds?.length > 0) {
          await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      }

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
                <div key={n.id} className={`p-3 rounded-xl border ${n.is_read ? 'bg-white dark:bg-black/20 border-gray-100 dark:border-white/5' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{n.title || "Уведомление"}</span>
                        <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{n.message}</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
