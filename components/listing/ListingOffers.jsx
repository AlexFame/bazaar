"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n-client";
import Image from "next/image";

export default function ListingOffers({ listingId }) {
    const { t, lang } = useLang();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    const translations = {
        ru: {
            incoming_offers: "Входящие предложения",
            no_offers: "Пока нет предложений.",
            accept: "Принять (Написать)",
            reject: "Отклонить",
            rejected: "Отклонено",
            accepted: "Принято",
            offer_from: "Предложение от",
        },
        ua: {
            incoming_offers: "Вхідні пропозиції",
            no_offers: "Поки немає пропозицій.",
            accept: "Прийняти (Написати)",
            reject: "Відхилити",
            rejected: "Відхилено",
            accepted: "Прийнято",
            offer_from: "Пропозиція від",
        },
        en: {
            incoming_offers: "Incoming Offers",
            no_offers: "No offers yet.",
            accept: "Accept (Write)",
            reject: "Reject",
            rejected: "Rejected",
            accepted: "Accepted",
            offer_from: "Offer from",
        }
    };
    const local = translations[lang] || translations.ru;

    useEffect(() => {
        loadOffers();
    }, [listingId]);

    const loadOffers = async () => {
        const { data, error } = await supabase
            .from('offers')
            .select('*, profiles:buyer_id(*)')
            .eq('listing_id', listingId)
            .order('created_at', { ascending: false });
        
        if (error) console.error(error);
        else setOffers(data || []);
        setLoading(false);
    };

    const handleAction = async (offerId, status, buyerUsername) => {
        // Optimistic update
        setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status } : o));

        try {
            await supabase.from('offers').update({ status }).eq('id', offerId);
            
            if (status === 'accepted' && buyerUsername) {
                // Open Telegram Chat
                window.open(`https://t.me/${buyerUsername}`, '_blank');
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return null;
    if (offers.length === 0) return null;

    return (
        <div className="mt-6 mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                <span>💸</span> {local.incoming_offers}
            </h3>
            <div className="flex flex-col gap-3">
                {offers.map(offer => (
                    <div key={offer.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden relative">
                                {offer.profiles?.avatar_url ? (
                                    <Image src={offer.profiles.avatar_url} alt="" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                        {(offer.profiles?.full_name?.[0] || "?")}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-lg font-bold text-black">{offer.price} €</div>
                                <div className="text-xs text-gray-500">
                                    {local.offer_from} {offer.profiles?.full_name || offer.profiles?.tg_username || "User"}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                            {offer.status === 'pending' && (
                                <>
                                    <button 
                                        onClick={() => handleAction(offer.id, 'accepted', offer.profiles?.tg_username)}
                                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors"
                                    >
                                        {local.accept}
                                    </button>
                                    <button 
                                        onClick={() => handleAction(offer.id, 'rejected')}
                                        className="px-3 py-1.5 bg-gray-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        {local.reject}
                                    </button>
                                </>
                            )}
                            {offer.status === 'accepted' && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">{local.accepted}</span>
                            )}
                            {offer.status === 'rejected' && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase">{local.rejected}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
