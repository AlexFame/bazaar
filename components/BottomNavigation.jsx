"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HomeIcon, 
  Squares2X2Icon, 
  PlusIcon, 
  ChatBubbleOvalLeftIcon, 
  UserIcon 
} from "@heroicons/react/24/outline";
import { 
  HomeIcon as HomeIconSolid, 
  Squares2X2Icon as Squares2X2IconSolid, 
  ChatBubbleOvalLeftIcon as ChatBubbleOvalLeftIconSolid, 
  UserIcon as UserIconSolid 
} from "@heroicons/react/24/solid";
import { useLang } from "@/lib/i18n-client";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

const NavItem = ({ href, label, IconOutline, IconSolid, isActive, id, badge }) => {
  return (
    <Link href={href} className="group flex flex-col items-center justify-center w-full h-full gap-1 relative no-underline z-10 text-center">
      
      <div className="relative flex items-center justify-center">
        {/* Active Pill Background (Sliding) */}
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute w-10 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-2xl -z-10"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        <motion.div 
          className="relative w-6 h-6"
        whileTap={{ scale: 0.8 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <div className="relative w-full h-full">
            {/* Outline Icon (Inactive) */}
            <motion.div
                initial={false}
                animate={{ 
                    opacity: isActive ? 0 : 1,
                    scale: isActive ? 0.5 : 1
                }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
            >
                <IconOutline className="w-6 h-6 text-gray-500" />
            </motion.div>

            {/* Solid Icon (Active) */}
            <motion.div
                initial={false}
                animate={{ 
                    opacity: isActive ? 1 : 0,
                    scale: isActive ? 1 : 0.5
                }}
                transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 20 
                }}
                className="absolute inset-0"
            >
                <IconSolid className="w-6 h-6 text-rose-600" />
            </motion.div>
        </div>
        {badge && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-[9px] font-bold text-white z-20">
              {badge === true ? "" : (badge > 99 ? "99+" : badge)}
            </span>
        )}
      </motion.div>
      </div>
      
      <motion.span 
        animate={{ color: isActive ? "#e11d48" : "var(--nav-text)" }}
        style={{ "--nav-text": "gray" }}
        className="text-[10px] font-medium"
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.span>
    </Link>
  );
};

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLang();
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
     let channel;
     async function init() {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;

        // Count unread MESSAGES where receiver is me (so sender != me) AND is_read = false
        // RLS for messages allows viewing messages in my conversations
        // We really want to count unique CONVERSATIONS with unread messages, or total messages? behavior varies.
        // User asked "Nad Chats tak i visit". Usually means unread chats.
        // Let's count unread messages.
        
        const fetchUnread = async () => {
             // 1. Messages Count
             const { count: msgs } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('is_read', false)
                .neq('sender_id', user.id); 
             setMsgCount(msgs || 0);

             // 2. Notifications Count (Offers, etc.)
             const { count: notifs } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('is_read', false)
                .eq('user_id', user.id);
             setNotifCount(notifs || 0);
        };
        fetchUnread();

        // Subscribe to messages table
        const channelMsgs = supabase
            .channel('realtime:bottom_nav_messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread)
            .subscribe();

        // Subscribe to notifications table
        const channelNotifs = supabase
            .channel('realtime:bottom_nav_notifs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchUnread)
            .subscribe();
            
        channel = { unsubscribe: () => { 
            supabase.removeChannel(channelMsgs); 
            supabase.removeChannel(channelNotifs); 
        }};
     }
     init();
     return () => {
         if (channel && channel.unsubscribe) channel.unsubscribe();
     };
  }, []);

  // Handle keyboard/input focus to hide nav
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Handler to detect input focus
    const handleFocusIn = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            setIsKeyboardOpen(true);
        }
    };

    const handleFocusOut = () => {
        // Small delay to prevent flickering if switching inputs
        setTimeout(() => {
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                setIsKeyboardOpen(false);
            }
        }, 100);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
        window.removeEventListener('focusin', handleFocusIn);
        window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Determine active tab
  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  // Hide on specific pages:
  // 1. /create (Focus on form)
  // 2. /messages/[id] (Chat room needs full height for keyboard)
  const isChatConversation = pathname.startsWith("/messages/") && pathname !== "/messages";
  const shouldHide = pathname.startsWith("/create") || isChatConversation || isKeyboardOpen;

  if (shouldHide) return null;

  return (
    <div id="mobile-bottom-nav" className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] z-50 transition-colors duration-300">
      <div className="grid grid-cols-5 h-16 max-w-[520px] mx-auto w-full">
        {/* Home */}
        <div className="h-full min-w-0">
            <NavItem 
            href="/" 
            id="home"
            label={t("navbar_home") || "Главная"} 
            IconOutline={HomeIcon} 
            IconSolid={HomeIconSolid} 
            isActive={isActive("/")} 
            />
        </div>

        {/* Catalog */}
        <div className="h-full min-w-0">
            <NavItem 
            href="/catalog" 
            id="catalog"
            label={t("navbar_catalog") || "Каталог"} 
            IconOutline={Squares2X2Icon} 
            IconSolid={Squares2X2IconSolid} 
            isActive={isActive("/catalog")} 
            />
        </div>

        {/* Create Listing (Prominent - No Pill) */}
        <div className="h-full min-w-0 relative z-20 overflow-visible flex items-end justify-center pb-2">
            <Link href="/create" className="flex flex-col items-center justify-end w-full h-full no-underline group">
            <motion.div 
                className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/30 text-white mb-1"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                <PlusIcon className="w-7 h-7" strokeWidth={2.5} />
            </motion.div>
            <span className="text-[10px] font-medium text-gray-500 whitespace-nowrap">
                {t("navbar_create") || "Создать"}
            </span>
            </Link>
        </div>

        {/* Chat */}
        <div className="h-full min-w-0">
            <NavItem 
            href="/messages" 
            id="messages"
            label={t("navbar_chats") || "Чаты"} 
            IconOutline={ChatBubbleOvalLeftIcon} 
            IconSolid={ChatBubbleOvalLeftIconSolid} 
            isActive={isActive("/messages")} 
            badge={msgCount > 0 ? msgCount : false}
            />
        </div>

        {/* Profile */}
        <div className="h-full min-w-0">
            <NavItem 
            href="/my" 
            id="profile"
            label={t("navbar_myAds") || "Профиль"} 
            IconOutline={UserIcon} 
            IconSolid={UserIconSolid} 
            isActive={isActive("/my")} 
            badge={notifCount > 0 ? notifCount : false}
            />
        </div>
      </div>
    </div>
  );
}
