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

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLang();

  const isActive = (path) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around items-center h-16 max-w-[520px] mx-auto px-2">
        {/* Home */}
        <Link href="/" className="flex flex-col items-center justify-center w-full h-full gap-1">
          {isActive("/") ? (
            <HomeIconSolid className="w-6 h-6 text-airbnb-red" />
          ) : (
            <HomeIcon className="w-6 h-6 text-gray-500" />
          )}
          <span className={`text-[10px] font-medium ${isActive("/") ? "text-black" : "text-gray-500"}`}>
            {t("navbar_brand") || "Главная"}
          </span>
        </Link>

        {/* Catalog */}
        <Link href="/catalog" className="flex flex-col items-center justify-center w-full h-full gap-1">
          {isActive("/catalog") ? (
            <Squares2X2IconSolid className="w-6 h-6 text-airbnb-red" />
          ) : (
            <Squares2X2Icon className="w-6 h-6 text-gray-500" />
          )}
          <span className={`text-[10px] font-medium ${isActive("/catalog") ? "text-black" : "text-gray-500"}`}>
            Каталог
          </span>
        </Link>

        {/* Create Listing (Prominent) */}
        <Link href="/create" className="flex flex-col items-center justify-center w-full h-full -mt-4">
          <div className="w-12 h-12 bg-airbnb-red rounded-full flex items-center justify-center shadow-lg text-white">
            <PlusIcon className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-medium text-gray-500 mt-1">
            Создать
          </span>
        </Link>

        {/* Chat */}
        <Link href="/messages" className="flex flex-col items-center justify-center w-full h-full gap-1">
          {isActive("/messages") ? (
            <ChatBubbleOvalLeftIconSolid className="w-6 h-6 text-airbnb-red" />
          ) : (
            <ChatBubbleOvalLeftIcon className="w-6 h-6 text-gray-500" />
          )}
          <span className={`text-[10px] font-medium ${isActive("/messages") ? "text-black" : "text-gray-500"}`}>
            {t("navbar_messages") || "Чат"}
          </span>
        </Link>

        {/* Profile */}
        <Link href="/my" className="flex flex-col items-center justify-center w-full h-full gap-1">
          {isActive("/my") ? (
            <UserIconSolid className="w-6 h-6 text-airbnb-red" />
          ) : (
            <UserIcon className="w-6 h-6 text-gray-500" />
          )}
          <span className={`text-[10px] font-medium ${isActive("/my") ? "text-black" : "text-gray-500"}`}>
            {t("navbar_profile") || "Профиль"}
          </span>
        </Link>
      </div>
    </div>
  );
}
