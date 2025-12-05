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

const NavItem = ({ href, label, IconOutline, IconSolid, isActive }) => {
  return (
    <Link href={href} className="group flex flex-col items-center justify-center w-full h-full gap-1 relative no-underline">
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
                <IconSolid className="w-6 h-6 text-black" />
            </motion.div>
        </div>
      </motion.div>
      
      <motion.span 
        className="text-[10px] font-medium"
        animate={{ color: isActive ? "#000000" : "#6b7280" }}
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

  const isActive = (path) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around items-center h-16 max-w-[520px] mx-auto px-2">
        {/* Home */}
        <NavItem 
          href="/" 
          label="Главная" 
          IconOutline={HomeIcon} 
          IconSolid={HomeIconSolid} 
          isActive={isActive("/")} 
        />

        {/* Catalog */}
        <NavItem 
          href="/catalog" 
          label="Каталог" 
          IconOutline={Squares2X2Icon} 
          IconSolid={Squares2X2IconSolid} 
          isActive={isActive("/catalog")} 
        />

        {/* Create Listing (Prominent) */}
        <Link href="/create" className="flex flex-col items-center justify-center w-full h-full -mt-4 no-underline">
          <motion.div 
            className="w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg text-white"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <PlusIcon className="w-7 h-7" strokeWidth={2.5} />
          </motion.div>
          <span className="text-[10px] font-medium text-gray-500 mt-1">
            Создать
          </span>
        </Link>

        {/* Chat */}
        <NavItem 
          href="/messages" 
          label={t("navbar_messages") || "Чат"} 
          IconOutline={ChatBubbleOvalLeftIcon} 
          IconSolid={ChatBubbleOvalLeftIconSolid} 
          isActive={isActive("/messages")} 
        />

        {/* Profile */}
        <NavItem 
          href="/my" 
          label="Профиль" 
          IconOutline={UserIcon} 
          IconSolid={UserIconSolid} 
          isActive={isActive("/my")} 
        />
      </div>
    </div>
  );
}
