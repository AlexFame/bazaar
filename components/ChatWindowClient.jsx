"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BackButton from "@/components/BackButton";
import { useLang } from "@/lib/i18n-client";
import { ChatDetailSkeleton } from "./SkeletonLoader";
import { motion, AnimatePresence } from "framer-motion";

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
  const typingTimeoutRef = useRef(null);
  const lastTypingTimeRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initChat = async () => {
      console.log("ChatWindow: Initializing...");
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();
      
      console.log("ChatWindow User:", user?.id);
      if (authError) console.error("ChatWindow Auth Error:", authError);

      if (!user) {
        console.log("ChatWindow: No user, redirecting to login");
        router.push("/login");
        return;
      }
      let currentUser = user;

      if (!currentUser) {
          // Try Telegram
          if (typeof window !== "undefined") {
              const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
              if (tgUser?.id) {
                  const { data: profile } = await supabase
                      .from("profiles")
                      .select("id, full_name, avatar_url")
                      .eq("tg_user_id", tgUser.id)
                      .single();
                  
                  if (profile) {
                      currentUser = profile;
                  }
              }
          }
      }

      if (!currentUser) {
        // If still no user, we can't show chat
        return;
      }
      setUser(currentUser);

      // Handle new chat (no conversation yet)
      if (conversationId === "new" && listingId && sellerId) {
        console.log("ChatWindow: New chat mode", { listingId, sellerId });
        
        // Fetch listing details
        const { data: listingData } = await supabase
          .from("listings")
          .select("id, title, price, image_path")
          .eq("id", listingId)
          .single();
        
        if (listingData) {
          setListing(listingData);
        }
        
        // Fetch seller profile
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", sellerId)
          .single();
        
        if (sellerProfile) {
          setOtherUser(sellerProfile);
        }
        
        // No messages yet
        setMessages([]);
        setLoading(false);
        setShowInput(true);
        return;
      }

      // Fetch conversation details (existing conversation)
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select(`
          *,
          listing:listings(id, title, price, image_path),
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

      // Check if profiles are loaded
      if (!conv.buyer || !conv.seller) {
        console.error("Missing profile data:", { buyer: conv.buyer, seller: conv.seller });
        setError("Не удалось загрузить данные собеседника");
        setLoading(false);
        return;
      }

      const other = conv.buyer_id === user.id ? conv.seller : conv.buyer;
      setOtherUser(other);
      setListing(conv.listing);

      // Fetch messages
      const { data: msgs, error: msgsError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgsError) {
        console.error("Error fetching messages:", msgsError);
      } else {
        setMessages(msgs || []);
        
        // Mark unread as read
        const unreadIds = msgs
            ?.filter(m => !m.is_read && m.sender_id !== user.id)
            .map(m => m.id);
        
        if (unreadIds?.length > 0) {
            await supabase
                .from('messages')
                .update({ is_read: true })
                .in('id', unreadIds);
        }
      }
      setLoading(false);

      // Subscribe to Realtime (Messages + Typing)
      const channel = supabase
        .channel(`chat:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
                setMessages((prev) => {
                  const exists = prev.some(m => m.id === payload.new.id);
                  if (exists) return prev;
                  return [...prev, payload.new];
                });
                
                if (payload.new.sender_id !== user.id) {
                    supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then();
                }
            } else if (payload.eventType === "UPDATE") {
                setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
            }
          }
        )
        .on("broadcast", { event: "typing" }, (payload) => {
           if (payload.payload.sender_id !== user.id) {
               setOtherUserTyping(true);
               // Clear typing after 3 seconds
               if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
               typingTimeoutRef.current = setTimeout(() => {
                   setOtherUserTyping(false);
               }, 3000);
           }
        })
        .subscribe();

      setChannel(channel);

      return () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        supabase.removeChannel(channel);
      };
    };

    initChat();
  }, [conversationId, router]);

  // Typing logic
  const handleTyping = () => {
    if (!channel) return;
    
    // Throttle sending typing events
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
    
    // Prevent duplicate sends
    if (isSending || !newMessage.trim() || !user) return;
    
    setIsSending(true); // Lock sending

    const content = newMessage.trim();
    setNewMessage("");
    setShowInput(false); // Hide input after sending
    
    try {
      let actualConversationId = conversationId;
      
      // Create conversation if this is a new chat
      if (conversationId === "new" && listingId && sellerId) {
        console.log("Creating conversation for first message...");
        
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: sellerId
          })
          .select()
          .single();
        
        if (convError) {
          console.error("Error creating conversation:", convError);
          alert("Не удалось создать чат: " + convError.message);
          setIsSending(false);
          return;
        }
        
        actualConversationId = newConv.id;
        console.log("Created conversation:", actualConversationId);
        
        // Update URL to use actual conversation ID
        router.replace(`/messages/${actualConversationId}`);
      }
    
      // Optimistic UI: Add message immediately
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
      scrollToBottom();

      // Send to server
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: actualConversationId,
          sender_id: user.id,
          content: content,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(m => m.id === optimisticMessage.id ? data : m)
      );

      // Send Push Notification via Telegram (Fire and forget)
      if (otherUser?.id) {
        console.log(`🔔 [ChatWindow] Sending Telegram notification to ${otherUser.id}`);
        fetch("/api/notifications/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId: otherUser.id,
            message: `💬 Новое сообщение: ${content}`,
            url: `https://t.me/bazaarua_bot/app?startapp=chat_${conversationId}`
          }),
        })
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                console.error(`❌ [ChatWindow] Notification failed: ${res.status}`, text);
            } else {
                console.log("✅ [ChatWindow] Notification sent");
            }
        })
        .catch(err => console.error("Failed to send push:", err));
      } else {
        console.warn("⚠️ [ChatWindow] No otherUser.id, cannot send notification");
      }

    } catch (error) {
      console.error("Error sending message:", error);
      alert("Ошибка отправки сообщения");
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(content); // Restore text
    } finally {
      setIsSending(false); // Unlock
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
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl;
  };

  if (loading) {
    return <ChatDetailSkeleton />;
  }

  return (
    <div 
      className="flex flex-col h-[100dvh] w-full max-w-[520px] mx-auto bg-white dark:bg-background" 
      style={{ 
        touchAction: 'pan-y',
        overflowX: 'hidden',
        position: 'relative',
        width: '100%',
        maxWidth: '520px'
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 p-3 pt-[calc(env(safe-area-inset-top)+12px)] border-b border-gray-100 dark:border-white/10 bg-white dark:bg-black sticky top-0 z-10">
        <BackButton />
        {otherUser && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0">
              {otherUser.avatar_url ? (
                <img src={otherUser.avatar_url} alt={otherUser.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                  {(otherUser.full_name || "U")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate text-black dark:text-white">{otherUser.full_name || "Пользователь"}</div>
              {listing && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{listing.title} · {listing.price} €</div>
              )}
            </div>
          </div>
        )}
        {/* Listing Image (Link to listing) */}
        {listing && (
            <a href={`/listing/${listing.id}`} className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 block">
                {listing.image_path && (
                    <img src={getImageUrl(listing.image_path)} alt={listing.title} className="w-full h-full object-cover" />
                )}
            </a>
        )}
      </div>

      {otherUserTyping && (
          <div className="absolute top-[65px] left-0 w-full px-3 z-0 pointer-events-none">
              <div className="text-xs text-gray-500 italic ml-14 animate-pulse">
                 {otherUser?.full_name || "Собеседник"} печатает...
              </div>
          </div>
      )}

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 pb-4 w-full"
      >
        <AnimatePresence initial={false}>
        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id;
          const showDate = index === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
          
          return (
            <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col w-full"
            >
                {showDate && (
                    <div className="flex justify-center my-4">
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
                            {new Date(msg.created_at).toLocaleDateString([], { day: 'numeric', month: 'long' })}
                        </span>
                    </div>
                )}
                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 w-full`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm relative group ${
                      isMe
                        ? "bg-black dark:bg-white text-white dark:text-black rounded-br-none"
                        : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words break-all min-w-[20px]">{msg.content || <span className="italic opacity-50">Пустое сообщение</span>}</p>
                    <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${isMe ? "text-white/60 dark:text-black/60" : "text-black/40 dark:text-white/40"}`}>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && msg.is_read && (
                            <span className="ml-1 font-medium">Прочитано</span>
                        )}
                        {isMe && !msg.is_read && (
                             <span>✓</span>
                        )}
                    </div>
                  </div>
                </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white dark:bg-black border-t border-gray-100 dark:border-white/10 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sticky bottom-0 z-10 w-full max-w-[520px] mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2 w-full"
        >
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("chat_placeholder") || "Написать сообщение..."}
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-2xl px-4 py-3 text-sm resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white min-w-0 w-full"
            rows={1}
            style={{ minHeight: "44px" }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
