"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import BackButton from "./BackButton";
import { useLang } from "@/lib/i18n-client";
import { ChatListSkeleton } from "./SkeletonLoader";

import NotificationsModal from "./NotificationsModal";

export default function ChatListClient() {
  const router = useRouter();
  const { t } = useLang();

  const [activeTab, setActiveTab] = useState("selling"); // 'selling' | 'buying'
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [fetchError, setFetchError] = useState(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let channel;

    // Fetch notification count & subscribe
    async function init() {
       const { data: { user } } = await supabase.auth.getUser();
       if (user) {
           const refreshCount = async () => {
                const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
                setNotifCount(count || 0);
           };
           
           refreshCount();

           channel = supabase
            .channel('realtime:chat_notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    refreshCount();
                }
            )
            .subscribe();
       }
    }
    init();

    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchUserAndChats = async () => {
      // Try Supabase Auth first
      let { data: { user } } = await supabase.auth.getUser();

      // If no Supabase user, try Telegram
      if (!user) {
          if (typeof window !== "undefined") {
              const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
              if (tgUser?.id) {
                  const { data: profile } = await supabase
                      .from("profiles")
                      .select("id, full_name, avatar_url")
                      .eq("tg_user_id", tgUser.id)
                      .single();
                  if (profile) user = profile;
              }
          }
      }

      if (!user) {
        setLoading(false);
        return;
      }
      
      setUser(user);

      // Fetch ALL conversations
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          updated_at,
          buyer_id,
          seller_id,
          listing:listings(id, title, image_path, price),
          buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url),
          deleted_by_buyer,
          deleted_by_seller
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching chats:", error);
        setFetchError(error.message);
      } else {
        // Fetch last message for each conversation
        const conversationsWithMessages = await Promise.all(
          (data || []).map(async (conv) => {
            const { data: lastMsg } = await supabase
              .from("messages")
              .select("content, created_at, sender_id")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            
            return { ...conv, lastMessage: lastMsg };
          })
        );
        
        setConversations(conversationsWithMessages);
        
        // Fetch unread messages count
        const { data: unreadData } = await supabase
            .from('messages')
            .select('conversation_id')
            .eq('is_read', false)
            .neq('sender_id', user.id);
        
        const counts = {};
        unreadData?.forEach(msg => {
            counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
        });
        setUnreadCounts(counts);
      }
      setLoading(false);
    };

    fetchUserAndChats();
    
    // Subscribe to realtime messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          // Ideally fetch the new message or increment count
           fetchUserAndChats();
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };

  }, [router]);

  // Filter conversations (exclude deleted)
  const activeConversations = conversations.filter(c => {
    if (!user) return false;
    if (c.buyer_id === user.id && c.deleted_by_buyer) return false;
    if (c.seller_id === user.id && c.deleted_by_seller) return false;
    return true;
  });

  const sellingChats = activeConversations.filter(c => c.seller_id === user?.id);
  const buyingChats = activeConversations.filter(c => c.buyer_id === user?.id);
  
  const displayedChats = activeTab === 'selling' ? sellingChats : buyingChats;

  const handleDeleteChat = async (e, conversationId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(t("delete_chat") + "?")) return;
    
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    const updates = {};
    if (user.id === conv.buyer_id) updates.deleted_by_buyer = true;
    else if (user.id === conv.seller_id) updates.deleted_by_seller = true;

    try {
        const { error } = await supabase
            .from('conversations')
            .update(updates)
            .eq('id', conversationId);
            
        if (error) throw error;
        
        // Remove from local state
        setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (e) {
        console.error("Error deleting chat:", e);
        alert(t("delete_error") || "Ошибка удаления");
    }
  };

  const getOtherParticipant = (conv) => {
    if (!user) return null;
    return conv.buyer_id === user.id ? conv.seller : conv.buyer;
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl;
  };

  if (loading) return <ChatListSkeleton />;

  return (
    <div className="min-h-screen bg-white dark:bg-black animate-fade-in pb-20">
      <div 
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)' }}
        className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10 px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <BackButton />
              <h1 className="text-lg font-bold dark:text-white">{t("navbar_messages")}</h1>
            </div>
            
             {/* Notification Bell */}
            <button 
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 dark:text-white text-black">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-black"></span>
              )}
            </button>
        </div>
        
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-white/10 rounded-xl">
            <button
                onClick={() => setActiveTab('selling')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'selling' 
                    ? 'bg-white dark:bg-card text-black dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
                {t("msg_tab_selling")}
            </button>
            <button
                onClick={() => setActiveTab('buying')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'buying' 
                    ? 'bg-white dark:bg-card text-black dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
                {t("msg_tab_buying")}
            </button>
        </div>
      </div>

      <div className="px-4 py-2">
        {!user ? (
          <div className="text-center mt-20">
            <p className="text-gray-500 mb-4">{t("msg_login")}</p>
            <Link href="/login" className="inline-block px-6 py-2 bg-black text-white rounded-xl">
              Войти
            </Link>
          </div>
        ) : displayedChats.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
             <p>{t("msg_no_chats")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayedChats.map((conv) => {
              const other = getOtherParticipant(conv);
              const listing = conv.listing;
              const unread = unreadCounts[conv.id] || 0;
              if (!other) return null;

              return (
                <div key={conv.id} className="relative group">
                <Link
                  href={`/messages/${conv.id}`}
                  className={`flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-colors border-b border-border last:border-0 ${unread > 0 ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                >
                  {/* Large Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-gray-700">
                    {other.avatar_url ? (
                      <img src={other.avatar_url} alt={other.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold bg-gray-100 dark:bg-gray-800">
                        {other.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className={`font-semibold text-[15px] truncate ${unread > 0 ? 'text-black dark:text-white' : 'text-foreground'}`}>
                        {listing?.title || other.full_name}  {/* Show Listing Title first if possible */}
                      </h3>
                      <span className={`text-[11px] ml-2 ${unread > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-400'}`}>
                        {(() => {
                            const d = new Date(conv.updated_at);
                            if (new Date().toDateString() === d.toDateString()) return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
                        })()}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-1 truncate">
                        {other.full_name}
                    </p>

                    <div className="flex justify-between items-end">
                        <p className={`text-[13px] truncate max-w-[85%] ${unread > 0 ? 'font-medium text-foreground' : 'text-gray-500'}`}>
                            {conv.lastMessage?.sender_id === user.id && <span className="text-gray-400">You: </span>}
                            {conv.lastMessage?.content || "No messages"}
                        </p>
                        {unread > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {unread}
                            </span>
                        )}
                    </div>
                  </div>
                  
                  {/* Listing Image Thumbnail */}
                  {listing?.image_path && (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 ml-1 border border-gray-200">
                        <img src={getImageUrl(listing.image_path)} className="w-full h-full object-cover" />
                    </div>
                  )}
                </Link>
                {/* Delete Button (Visible on Hover/Swipe) */}
                <button
                    onClick={(e) => handleDeleteChat(e, conv.id)}
                    className="absolute top-3 right-3 p-2 bg-white dark:bg-black rounded-full shadow-sm text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title={t("delete_chat")}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NotificationsModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
}
