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
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-black pointer-events-none" />
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

  useEffect(() => {
      let channel;

      async function init() {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
              // Initial load
              const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
              setNotifCount(count || 0);

              // Subscribe
              channel = supabase
                .channel('realtime:notifications')
                .on(
                  'postgres_changes',
                  {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                  },
                  (payload) => {
                     if (!payload.new.is_read) {
                         setNotifCount(prev => prev + 1);
                     }
                  }
                )
                .on(
                  'postgres_changes',
                  {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                  },
                  () => {
                     // Reload count on update (e.g. read status change)
                     supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)
                       .then(({ count }) => setNotifCount(count || 0));
                  }
                )
                .subscribe((status) => {
                    console.log(`[Realtime] Notifications subscription status: ${status}`, { userId: user.id });
                });
          }
      }

      init();

      return () => {
          if (channel) supabase.removeChannel(channel);
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

  if (isKeyboardOpen) return null;

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
            badge={notifCount > 0}
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
            />
        </div>
      </div>
    </div>
  );
}
