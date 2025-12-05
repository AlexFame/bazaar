"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/i18n-client";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

function formatLastSeen(lastSeen, lang) {
  if (!lastSeen) return null;
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 5) return lang === 'en' ? 'Online' : 'Онлайн';
  if (diffMinutes < 60) return lang === 'en' ? `Was online ${diffMinutes}m ago` : `Был(а) ${diffMinutes} мин. назад`;
  if (diffMinutes < 24 * 60) {
      const hours = Math.floor(diffMinutes / 60);
      return lang === 'en' ? `Was online ${hours}h ago` : `Был(а) ${hours} ч. назад`;
  }
  return null; // Too old to show
}

function getSellerActivityStats(lastSeen, lang) {
    if (!lastSeen) return null;
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);
    
    if (diffMinutes < 15) {
        return {
            label: lang === 'en' ? 'Very active' : 'Очень активен',
            sub: lang === 'en' ? 'Replies in ~5 min' : 'Отвечает за ~5 мин',
            color: 'text-green-600 bg-green-50'
        };
    }
    
    if (diffMinutes < 120) {
        return {
            label: lang === 'en' ? 'Usually replies fast' : 'Обычно отвечает быстро',
            sub: lang === 'en' ? 'Replies in ~30 min' : 'Отвечает за ~30 мин',
            color: 'text-blue-600 bg-blue-50'
        };
    }

    return null;
}

// Helpers for contact parsing
function buildContactLink(raw) {
  if (!raw) return null;
  const contact = raw.trim();
  if (contact.startsWith("@")) {
    const username = contact.slice(1).split(" ")[0];
    if (username) return `https://t.me/${username}`;
  }
  if (contact.includes("t.me/")) {
    return contact.startsWith("http") ? contact : `https://${contact}`;
  }
  const phone = contact.replace(/[^\d+]/g, "");
  if (phone.length >= 6) return `tel:${phone}`;
  return null;
}

function detectType(raw) {
  if (!raw) return { isPhone: false, isTelegram: false };
  const c = raw.trim();
  const isTelegram = c.startsWith("@") || c.includes("t.me/");
  const cleaned = c.replace(/[^\d+]/g, "");
  const isPhone = cleaned.length >= 6;
  return { isPhone, isTelegram };
}


export default function SellerCard({ listing, isOwner }) {
    const { t, lang } = useLang();
    const router = useRouter();
    const profile = listing.profiles;

    if (!profile) return null;
    
    // Contact logic
    const handleWriteToSeller = async (e) => {
        e.preventDefault();
        trackAnalyticsEvent(listing.id, 'message_click');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }
        router.push(`/messages/new?listing_id=${listing.id}&seller_id=${listing.created_by}`);
    };

    // Parse contacts from listing if available (legacy fallback)
    const rawContacts = String(listing.contacts || "");
    const parts = rawContacts.split(/[,;]+/).map((c) => c.trim()).filter(Boolean);
    let phoneLink = null;
    for (const part of parts) {
        const { isPhone } = detectType(part);
        const link = buildContactLink(part);
        if (link && isPhone && !phoneLink) phoneLink = link;
    }

    return (
        <div className="mb-4">
             <Link href={`/profile/${profile.id}`} className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors no-underline">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative border border-gray-200">
                    {profile.avatar_url ? (
                        <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                            {(profile.full_name || profile.tg_username || "U")[0].toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-black">{profile.full_name || profile.tg_username || (t("user_default") || "Пользователь")}</span>
                        {profile.is_verified && (
                            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                    <div className="text-xs text-gray-500">{t("view_profile")}</div>
                    {profile.last_seen && (
                        <div className="text-[10px] text-green-600 font-medium mt-0.5">
                            {formatLastSeen(profile.last_seen, lang)}
                        </div>
                    )}
                    
                    {/* Seller Activity Stats */}
                    {(() => {
                        const stats = getSellerActivityStats(profile.last_seen, lang);
                        if (!stats) return null;
                        return (
                            <div className={`text-[10px] px-1.5 py-0.5 rounded-md inline-block mt-1 ${stats.color}`}>
                                <span className="font-bold">{stats.label}</span> • {stats.sub}
                            </div>
                        );
                    })()}
                </div>
            </Link>

            {/* Buttons (Only for non-owners) */}
            {!isOwner && (
                 <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleWriteToSeller}
                        className="flex-1 px-3 py-2 text-xs font-semibold rounded-full bg-black text-white text-center hover:bg-gray-800 transition-colors"
                    >
                        {t("write_msg")}
                    </button>

                    {phoneLink && (
                        <a
                        href={phoneLink}
                        onClick={() => trackAnalyticsEvent(listing.id, 'contact_click', { contact_type: 'phone' })}
                        className="flex-1 px-3 py-2 text-xs font-semibold rounded-full bg-white border border-black text-black text-center hover:bg-gray-50 transition-colors"
                        >
                        {t("msg_call")}
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
