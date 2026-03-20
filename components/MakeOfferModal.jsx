"use client";
import React, { useState } from 'react';
import FadeIn from "@/components/FadeIn";
import { useLang } from "@/lib/i18n-client";

export default function MakeOfferModal({ isOpen, onClose, onSubmit, listingTitle, listingPrice, symbol = '€' }) {
    const { t } = useLang();
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        const numPrice = Number(price);
        if (!price || isNaN(numPrice) || numPrice <= 0) {
            alert(t("invalid_price") || "Пожалуйста, введите корректную цену");
            return;
        }
        if (listingPrice && numPrice > listingPrice) {
            alert((t("price_too_high") || "Ваше предложение не может быть выше начальной цены: ") + listingPrice);
            return;
        }
        setLoading(true);
        await onSubmit(numPrice);
        setLoading(false);
        onClose();
    };

    const handlePriceChange = (val) => {
        // Just allow numbers
        const cleaned = val.replace(/\D/g, '');
        // prevent leading zeros unless it's just '0'
        if (cleaned.length > 1 && cleaned.startsWith('0')) {
            setPrice(cleaned.replace(/^0+/, ''));
        } else {
            setPrice(cleaned);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-start pt-[80px] sm:items-center sm:pt-0 justify-center p-4 sm:p-4 animate-in fade-in duration-200"
            style={{ touchAction: 'none' }} // Prevents iOS overscroll/swipe on the backdrop
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <FadeIn className="relative w-full max-w-sm z-10">
            <div className="bg-white rounded-2xl w-full shadow-2xl flex flex-col max-h-[85vh]">
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-5 overflow-y-auto custom-scrollbar">
                    <div className="text-center mb-6 mt-2">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                            🔖
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{t("make_offer_title") || "Предложить цену"}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{listingTitle}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                            {t("your_price") || "Ваша цена"}
                        </label>
                        
                        {/* Price Input Display */}
                        <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100 mb-4 flex items-center justify-center relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={price}
                                onChange={(e) => handlePriceChange(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="w-full bg-transparent text-center text-4xl font-black text-black tracking-tight outline-none"
                                placeholder="0"
                            />
                            <span className="text-2xl text-gray-400 font-medium absolute right-6">{symbol}</span>
                        </div>
                        
                        {/* Price Slider */}
                        {listingPrice && (
                            <div className="px-4 py-2 touch-none select-none mb-2" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                                <input
                                    type="range"
                                    min={0}
                                    max={listingPrice}
                                    step={1}
                                    value={Number(price) || 0}
                                    onChange={(e) => handlePriceChange(e.target.value)}
                                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black touch-none"
                                />
                                <div className="flex justify-between mt-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                    <span>0{symbol}</span>
                                    <span>Max: {listingPrice}{symbol}</span>
                                </div>
                            </div>
                        )}
                    </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 bg-black text-white rounded-xl font-bold text-base hover:bg-gray-800 transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {loading ? (t("sending") || "Отправка...") : (t("send_offer") || "Отправить предложение")}
                        </button>
                        
                        <p className="text-xs text-center text-gray-400">
                            {t("offer_hint") || "Продавец получит уведомление и сможет принять или отклонить ваше предложение."}
                        </p>
                    </form>
                </div>
            </div>
            </FadeIn>
        </div>
    );
}
