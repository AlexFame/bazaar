"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { UserService } from "@/lib/services/UserService";
import Link from "next/link";
import { useLang } from "@/lib/i18n-client";
import { ChatDetailSkeleton } from "./SkeletonLoader";

export default function ChatWindowClient({ conversationId, listingId, sellerId }) {
  const router = useRouter();
  const { t } = useLang();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [listing, setListing] = useState(null);
  const [showInput, setShowInput] = useState(false);
  const [isSending, setIsSending] = useState(false); // Prevent duplicate sends
  const [error, setError] = useState(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [channel, setChannel] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollToBottom = (smooth = false) => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'end' });
    }
  };

  useEffect(() => {
    // Scroll instantly on initial load so user starts at the newest message seamlessly
    const timer = setTimeout(() => scrollToBottom(false), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Expand Telegram WebApp to claim full space
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        window.Telegram.WebApp.expand();
    }

    // CRITICAL: Lock the OS from scrolling the document body to prevent the 
    // "bouncing page" / "text riding up" bug when the keyboard opens in WebKit.
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.bottom = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.bottom = '';
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
    };
  }, []);

  useEffect(() => {
    const initChat = async () => {
      console.log("ChatWindow: Initializing...");
      
      // Use API Strategy if Telegram InitData available
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
          try {
              // 1. Fetch Details via API (Bypassing RLS)
              const res = await fetch('/api/conversations/detail', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      conversationId: conversationId === 'new' ? undefined : conversationId, 
                      initData: window.Telegram.WebApp.initData 
                  })
              });
              
              if (res.ok) {
                  const data = await res.json();
                  
                  if (data.currentUser) setUser(data.currentUser);
                  
                  if (data.conversation) {
                      const conv = data.conversation;
                      setListing(conv.listing);
                      
                      const myId = data.currentUser?.id;
                      if (myId) {
                          const other = conv.buyer_id === myId ? conv.seller : conv.buyer;
                          setOtherUser(other);
                      }
                  }
                  
                  if (data.messages) setMessages(data.messages);
                  setShowInput(true); // Always confirm IO
                  setLoading(false);
                  
                  // Subscribe to Realtime (Best Effort)
                  const channel = supabase
                    .channel(`chat:${conversationId}`)
                    .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
                        if (payload.eventType === "INSERT") {
                            setMessages((prev) => {
                                if (prev.some(m => m.id === payload.new.id)) return prev;
                                return [...prev, payload.new];
                            });
                             // Mark read logic omitted for realtime purely, let API handle it on load
                        } else if (payload.eventType === "UPDATE") {
                            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
                        }
                    })
                    .on("broadcast", { event: "typing" }, (payload) => {
                        // Optimistically assume sender_id check
                        if (payload.payload.sender_id && payload.payload.sender_id !== data.currentUser?.id) {
                            setOtherUserTyping(true);
                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                            typingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 3000);
                        }
                    })
                    .subscribe();
                    
                  setChannel(channel);
                  return;
              }
              
              if (conversationId === 'new') {
                   // Fall through to manual setup
              }

          } catch (e) {
              console.error("API Detail fetch failed", e);
          }
      }

      // Fallback to legacy RLS
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) console.error("ChatWindow Auth Error:", authError);

      let currentUser = authUser;

      if (!currentUser) {
          if (typeof window !== "undefined") {
              const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
              if (tgUser?.id) {
                  const profile = await UserService.getByTgId(tgUser.id);
                  if (profile) currentUser = profile;
              }
          }
      }

      if (!currentUser) {
        console.log("ChatWindow: No user, redirecting to login");
        router.push("/login");
        return;
      }
      setUser(currentUser);

      if (conversationId === "new" && listingId && sellerId) {
        console.log("ChatWindow: New chat mode", { listingId, sellerId });
        const { data: listingData } = await supabase.from("listings").select("id, title, price, main_image_path").eq("id", listingId).single();
        if (listingData) setListing(listingData);
        const sellerProfile = await UserService.getById(sellerId);
        if (sellerProfile) setOtherUser(sellerProfile);
        setMessages([]);
        setLoading(false);
        setShowInput(true);
        return;
      }

      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select(`
          *,
          listing:listings(id, title, price, main_image_path),
          buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)
        `)
        .eq("id", conversationId)
        .single();

      if (convError || !conv) {
        console.error("Error fetching conversation:", convError);
        router.push("/messages");
        return;
      }

      if (!conv.buyer || !conv.seller) {
        console.error("Missing profile data:", { buyer: conv.buyer, seller: conv.seller });
        setError(t("chat_error_load") || "Не удалось загрузить данные собеседника");
        setLoading(false);
        return;
      }

      const other = conv.buyer_id === currentUser.id ? conv.seller : conv.buyer;
      setOtherUser(other);
      setListing(conv.listing);

      const { data: msgs, error: msgsError } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });

      if (msgsError) {
        console.error("Error fetching messages:", msgsError);
      } else {
        setMessages(msgs || []);
        const unreadIds = msgs?.filter(m => !m.is_read && m.sender_id !== currentUser.id).map(m => m.id);
        if (unreadIds?.length > 0) {
            await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        }
      }
      setLoading(false);
      setShowInput(true);

      const channel = supabase.channel(`chat:${conversationId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
            if (payload.eventType === "INSERT") {
                setMessages((prev) => {
                  if (prev.some(m => m.id === payload.new.id)) return prev;
                  return [...prev, payload.new];
                });
                if (payload.new.sender_id !== currentUser.id) {
                    supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then();
                }
            } else if (payload.eventType === "UPDATE") {
                setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
            }
        })
        .on("broadcast", { event: "typing" }, (payload) => {
           if (payload.payload.sender_id !== currentUser.id) {
               setOtherUserTyping(true);
               if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
               typingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 3000);
           }
        })
        .subscribe();

      setChannel(channel);

      return () => {
         supabase.removeChannel(channel);
      };
    };

    initChat();
  }, [conversationId, router]);

  // Typing logic
  const handleTyping = () => {
    if (!channel) return;
    const now = Date.now();
    if (now - lastTypingTimeRef.current > 2000) {
        channel.send({
            type: "broadcast",
            event: "typing",
            payload: { sender_id: user.id },
        });
        lastTypingTimeRef.current = now;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (isSending || !newMessage.trim() || !user) return;
    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    setShowInput(false);

    try {
        let actualConversationId = conversationId;
        const isTelegram = typeof window !== "undefined" && window.Telegram?.WebApp?.initData;

        if (conversationId === "new" && listingId && sellerId) {
            if (isTelegram) {
                const res = await fetch('/api/conversations/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        initData: window.Telegram.WebApp.initData,
                        listingId, 
                        sellerId 
                    })
                });
                if (!res.ok) throw new Error('Failed to create chat');
                const newConv = await res.json();
                actualConversationId = newConv.id;
                router.replace(`/messages/${actualConversationId}`);
            } else {
                 // Fallback RLS
                 const { data: newConv, error: convError } = await supabase
                  .from("conversations")
                  .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId })
                  .select().single();
                 if (convError) throw convError;
                 actualConversationId = newConv.id;
                 router.replace(`/messages/${actualConversationId}`);
            }
        }

       // Optimistic UI
       const optimisticMessage = {
          id: `temp-${Date.now()}`,
          conversation_id: actualConversationId,
          sender_id: user.id,
          content: content,
          created_at: new Date().toISOString(),
          is_optimistic: true,
          is_read: false
       };
       setMessages(prev => [...prev, optimisticMessage]);
       setTimeout(() => scrollToBottom(true), 50);

       // Send Message
       if (isTelegram) {
           const res = await fetch('/api/conversations/send', {
               method: 'POST',
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({
                   initData: window.Telegram.WebApp.initData,
                   conversationId: actualConversationId,
                   content
               })
           });
           if (!res.ok) throw new Error('Failed to send message');
           const data = await res.json();
           setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? data : m));
       } else {
           const { data, error } = await supabase.from("messages").insert({
              conversation_id: actualConversationId, sender_id: user.id, content
           }).select().single();
           if (error) throw error;
           setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? data : m));
       }

       // Send Push
       if (otherUser?.id) {
           fetch("/api/notifications/telegram", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               recipientId: otherUser.id,
               message: `${t("chat_new_msg") || "💬 Новое сообщение:"} ${content}`,
               url: `https://t.me/bazaarua_bot/app?startapp=chat_${conversationId}`
             }),
           }).catch(console.error);
       }

    } catch (error) {
       console.error("Error sending message:", error);
       alert(t("chat_error_send") || "Ошибка отправки сообщения");
       setMessages(prev => prev.filter(m => m.id !== `temp-${Date.now()}`));
       setNewMessage(content);
    } finally {
       setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    try {
        let cleanPath = path;
        if (Array.isArray(cleanPath)) {
            cleanPath = cleanPath[0];
        } else if (typeof cleanPath === 'string' && cleanPath.startsWith('[')) {
             try {
                 const parsed = JSON.parse(cleanPath);
                 if (Array.isArray(parsed)) cleanPath = parsed[0];
             } catch (e) { }
        }
        if (!cleanPath || typeof cleanPath !== 'string') return null;
        const trimmed = cleanPath.trim();
        if (trimmed.length < 5 || trimmed.toLowerCase().includes('фото') || trimmed.toLowerCase().includes('photo')) return null;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        const { data } = supabase.storage.from("listing-images").getPublicUrl(trimmed);
        return data?.publicUrl;
    } catch (error) {
        return null;
    }
  };

  const listingImageUrl = listing ? getImageUrl(listing.main_image_path) : null;

  if (loading) return <ChatDetailSkeleton />;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-background flex flex-col w-full max-w-[520px] mx-auto overflow-hidden" style={{ height: 'var(--tg-viewport-stable-height, 100dvh)' }}>
      <div className="flex-shrink-0 z-50 flex items-center justify-between gap-3 p-2 pt-[calc(env(safe-area-inset-top)+8px)] border-b border-gray-100 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-xl w-full shadow-sm">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button onClick={() => router.back()} className="p-2 -ml-1 text-blue-500 hover:text-blue-600 transition-colors bg-transparent border-none outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>
            {otherUser && (
            <Link href={`/profile/${otherUser.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/10 relative">
                {otherUser.avatar_url ? (
                    <img src={otherUser.avatar_url.startsWith('http') ? otherUser.avatar_url : (supabase.storage.from('avatars').getPublicUrl(otherUser.avatar_url).data?.publicUrl || otherUser.avatar_url)} alt={otherUser.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                ) : null}
                <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-xs bg-gray-100 dark:bg-gray-800" style={{ display: otherUser.avatar_url ? 'none' : 'flex' }}>
                    {(otherUser.full_name || "U")[0].toUpperCase()}
                </div>
                </div>
                <div className="flex-col justify-center flex-1 min-w-0 flex">
                <div className="font-bold text-sm truncate text-black dark:text-white leading-tight">{otherUser.full_name || t("chat_partner") || "Собеседник"}</div>
                {listing && <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">{listing.title} · {listing.price} {listing.currency || '€'}</div>}
                </div>
            </Link>
            )}
        </div>
        {listing && listingImageUrl && (
            <a href={`/listing/${listing.id}`} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 block border border-gray-100 dark:border-white/10 relative">
                <img src={listingImageUrl} alt={listing.title} className="w-full h-full object-cover" />
            </a>
        )}
      </div>

      {otherUserTyping && (
          <div className="fixed top-[calc(env(safe-area-inset-top)+75px)] left-0 right-0 max-w-[520px] mx-auto px-3 z-40 pointer-events-none">
              <div className="text-xs text-gray-500 italic ml-14 animate-pulse">
                 {otherUser?.full_name || t("chat_partner") || "Собеседник"} {t("chat_typing") || "печатает..."}
              </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto w-full p-3 pb-4 flex flex-col-reverse relative" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
        {messages.slice().reverse().map((msg, index) => {
           const originalIndex = messages.length - 1 - index;
           const isMe = msg.sender_id === user?.id;
           const showDate = originalIndex === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[originalIndex - 1].created_at).toDateString();
           return (
            <div key={msg.id} className="flex flex-col w-full flex-shrink-0">
                {showDate && (
                    <div className="flex justify-center my-4"><span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full">{new Date(msg.created_at).toLocaleDateString([], { day: 'numeric', month: 'long' })}</span></div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 w-full items-end gap-1.5`}>
                  {!isMe && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-gray-700">
                          {otherUser?.avatar_url && (
                              <img src={otherUser.avatar_url.startsWith('http') ? otherUser.avatar_url : (supabase.storage.from('avatars').getPublicUrl(otherUser.avatar_url).data?.publicUrl || otherUser.avatar_url)} alt="A" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                          )}
                          <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-[10px] bg-gray-100 dark:bg-gray-800" style={{ display: otherUser?.avatar_url ? 'none' : 'flex' }}>
                             {(otherUser?.full_name || "U")[0].toUpperCase()}
                          </div>
                      </div>
                  )}

                  <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm relative group ${isMe ? "bg-black dark:bg-white text-white dark:text-black rounded-br-[4px]" : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-bl-[4px]"}`}>
                    <p className="whitespace-pre-wrap break-words min-w-[20px]">{msg.content || <span className="italic opacity-50">{t("chat_empty_msg") || "Пустое сообщение"}</span>}</p>
                    <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${isMe ? "text-white/60 dark:text-black/60" : "text-black/40 dark:text-white/40"}`}>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && msg.is_read && <span className="ml-1 font-medium">{t("chat_read") || "Прочитано"}</span>}
                        {isMe && !msg.is_read && <span>✓</span>}
                    </div>
                  </div>

                  {isMe && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-gray-700">
                          {user?.avatar_url && (
                              <img src={user.avatar_url.startsWith('http') ? user.avatar_url : (supabase.storage.from('avatars').getPublicUrl(user.avatar_url).data?.publicUrl || user.avatar_url)} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                          )}
                          <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-[10px] bg-gray-100 dark:bg-gray-800" style={{ display: user?.avatar_url ? 'none' : 'flex' }}>
                             {(user?.full_name || "Я")[0].toUpperCase()}
                          </div>
                      </div>
                  )}

                </div>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 z-50 bg-white dark:bg-black border-t border-gray-100 dark:border-white/10 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] w-full max-w-[520px] mx-auto">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(e); }} className="flex items-end gap-2 w-full">
          <textarea ref={textareaRef} value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} onKeyDown={handleKeyDown} placeholder={t("chat_placeholder") || "Написать сообщение..."} className="flex-1 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-2xl px-4 py-3 text-sm resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white min-w-0 w-full" rows={1} style={{ minHeight: "44px" }} />
          <button type="submit" disabled={!newMessage.trim() || isSending} className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95">
            {isSending ? <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>}
          </button>
        </form>
      </div>
    </div>
  );
}
