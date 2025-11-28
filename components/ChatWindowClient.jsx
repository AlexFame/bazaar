"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BackButton from "@/components/BackButton";

export default function ChatWindowClient({ conversationId }) {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [listing, setListing] = useState(null);
  const [showInput, setShowInput] = useState(false);
  const [isSending, setIsSending] = useState(false); // Prevent duplicate sends
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
      setUser(user);

      // Fetch conversation details
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

      // Subscribe to new messages
      const channel = supabase
        .channel(`chat:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            // Prevent duplicates: check if message already exists
            setMessages((prev) => {
              const exists = prev.some(m => m.id === payload.new.id);
              if (exists) {
                console.log("⚠️ Duplicate message prevented:", payload.new.id);
                return prev;
              }
              return [...prev, payload.new];
            });
            
            // Mark as read immediately if I'm looking at the chat
            if (payload.new.sender_id !== user.id) {
                supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('id', payload.new.id)
                    .then();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    initChat();
  }, [conversationId, router]);

  const handleSend = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate sends
    if (isSending || !newMessage.trim() || !user) return;
    
    setIsSending(true); // Lock sending

    const content = newMessage.trim();
    setNewMessage("");
    setShowInput(false); // Hide input after sending
    
    // Optimistic UI: Add message immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content: content,
      created_at: new Date().toISOString(),
      is_optimistic: true
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    // Send to server
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      alert("Не удалось отправить сообщение");
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(content); // Restore text
    } else {
      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(m => m.id === optimisticMessage.id ? data : m)
      );

      // Send Push Notification (Fire and forget)
      if (otherUser?.id) {
        console.log(`🔔 [ChatWindow] Sending notification to ${otherUser.id}`);
        fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId: otherUser.id,
            message: content,
            listingTitle: listing?.title || "Товар"
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
        .catch(err => console.error("❌ [ChatWindow] Notification network error:", err));
      } else {
        console.warn("⚠️ [ChatWindow] No otherUser.id, cannot send notification");
      }
    }
    
    setIsSending(false); // Unlock sending
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-[520px] mx-auto bg-white dark:bg-black">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 p-3 pt-[calc(env(safe-area-inset-top)+12px)] border-b border-gray-100 dark:border-white/10 bg-white dark:bg-black sticky top-0 z-10">
        <BackButton />
        {otherUser && (
          <div className="flex items-center gap-2 flex-1">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
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

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-3 space-y-3 pb-4"
      >
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? "bg-black dark:bg-white text-white dark:text-black rounded-br-none"
                    : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <div className={`text-[9px] mt-1 text-right ${isMe ? "text-white/60 dark:text-black/60" : "text-black/40 dark:text-white/40"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Always visible */}
      <div className="flex-shrink-0 p-3 bg-white dark:bg-black border-t border-gray-100 dark:border-white/10 pb-[calc(env(safe-area-inset-bottom)+12px)] z-50 relative">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Написать сообщение..."
            className="flex-1 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-2xl px-4 py-3 text-base outline-none resize-none max-h-32 min-h-[44px] placeholder-gray-500 dark:placeholder-gray-400"
            rows={1}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                }
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="w-11 h-11 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mb-[1px]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
