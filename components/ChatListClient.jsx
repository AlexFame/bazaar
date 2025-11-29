"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import BackButton from "./BackButton";

export default function ChatListClient() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    const fetchUserAndChats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // Fetch conversations
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          updated_at,
          listing:listings(id, title, image_path, price),
          buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url)
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
  }, [router]);

  const getOtherParticipant = (conv) => {
    if (!user) return null;
    return conv.buyer_id === user.id ? conv.seller : conv.buyer;
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data?.publicUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4 flex justify-center items-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white animate-fade-in pb-20">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <BackButton />
        <h1 className="text-lg font-bold">Сообщения</h1>
      </div>

      <div className="px-4 py-2">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            {fetchError ? (
                <div className="text-red-500 px-4">
                    <p className="font-bold">Ошибка загрузки:</p>
                    <p className="text-sm">{fetchError}</p>
                </div>
            ) : (
                <p>У вас пока нет сообщений</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const listing = conv.listing;
              const unread = unreadCounts[conv.id] || 0;
              if (!other) return null;

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0 ${unread > 0 ? 'bg-blue-50/50' : ''}`}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex-shrink-0 relative">
                    {other.avatar_url ? (
                      <img
                        src={other.avatar_url}
                        alt={other.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg font-bold">
                        {other.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className={`font-semibold text-sm truncate ${unread > 0 ? 'text-black' : 'text-gray-900'}`}>
                        {other.full_name || "Пользователь"}
                      </h3>
                      <div className="flex flex-col items-end">
                        <span className={`text-[10px] whitespace-nowrap ml-2 ${unread > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                            {(() => {
                                const date = new Date(conv.updated_at);
                                const now = new Date();
                                const isToday = date.toDateString() === now.toDateString();
                                const yesterday = new Date(now);
                                yesterday.setDate(yesterday.getDate() - 1);
                                const isYesterday = date.toDateString() === yesterday.toDateString();
                                
                                if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                if (isYesterday) return "Вчера";
                                return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
                            })()}
                        </span>
                        {unread > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center mt-1">
                                {unread}
                            </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Last Message Preview */}
                    {conv.lastMessage ? (
                      <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                        {conv.lastMessage.sender_id === user?.id ? 'Вы: ' : ''}
                        {conv.lastMessage.content}
                      </p>
                    ) : listing && (
                      <div className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                        <span className="font-medium text-black/70">{listing.title}</span>
                        <span>•</span>
                        <span>{listing.price} €</span>
                      </div>
                    )}
                  </div>

                  {/* Listing Image (Small) */}
                  {listing?.image_path && (
                    <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 ml-2">
                        <img 
                            src={getImageUrl(listing.image_path)} 
                            alt={listing.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
