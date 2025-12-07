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

const NavItem = ({ href, label, IconOutline, IconSolid, isActive, id }) => {
  return (
    <Link href={href} className="group flex flex-col items-center justify-center w-full h-full gap-1 relative no-underline z-10 text-center">
      
      {/* Active Pill Background (Sliding) */}
      {isActive && (
        <motion.div
          layoutId="nav-pill"
          className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-full -z-10"
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
      </motion.div>
      
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

  // Helper to determine active tab based on path prefix
  // Exact match for home, prefix for others
  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <div id="mobile-bottom-nav" className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] z-50 transition-colors duration-300">
      <div className="flex items-center justify-between h-16 max-w-[520px] mx-auto px-2">
        {/* Home */}
        <div className="flex-1 h-full mx-1">
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
        <div className="flex-1 h-full mx-1">
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
        <div className="flex-1 h-full mx-1 relative z-20 overflow-visible flex items-end justify-center pb-2">
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
        <div className="flex-1 h-full mx-1">
            <NavItem 
            href="/messages" 
            id="messages"
            label={t("navbar_messages") || "Чат"} 
            IconOutline={ChatBubbleOvalLeftIcon} 
            IconSolid={ChatBubbleOvalLeftIconSolid} 
            isActive={isActive("/messages")} 
            />
        </div>

        {/* Profile */}
        <div className="flex-1 h-full mx-1">
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
