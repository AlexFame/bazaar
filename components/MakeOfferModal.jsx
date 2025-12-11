"use client";
import React, { useState } from 'react';
import FadeIn from "@/components/FadeIn";
import { useLang } from "@/lib/i18n-client";

export default function MakeOfferModal({ isOpen, onClose, onSubmit, listingTitle, currentPrice, symbol = '€' }) {
    const { t } = useLang();
    // Default to current price logic
    const safeCurrent = Number(currentPrice) || 0;
    const [price, setPrice] = useState(safeCurrent > 0 ? safeCurrent : '');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSliderChange = (e) => {
        setPrice(Number(e.target.value));
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        if (val === '') setPrice('');
        else setPrice(Number(val));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!price || isNaN(price) || Number(price) <= 0) {
            alert(t("invalid_price") || "Пожалуйста, введите корректную цену");
            return;
        }
        setLoading(true);
        await onSubmit(Number(price));
        setLoading(false);
        // setPrice(''); // Don't reset to empty, maybe reset to max? or keep last intent
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <FadeIn>
            <div className="bg-white rounded-2xl w-[90vw] max-w-sm p-5 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center mb-6 mt-2">
                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-3 text-2xl shadow-lg transform rotate-[-10deg]">
                        🔨
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{t("bargain_title") || "Торг"}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{listingTitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="px-2">
                        {safeCurrent > 0 && (
                             <div className="mb-4">
                                <label className="flex justify-between text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                                    <span>{t("your_offer") || "Ваше предложение"}</span>
                                    <span>MAX: {safeCurrent} {symbol}</span>
                                </label>
                                
                                <div className="relative h-2 bg-gray-200 rounded-full mb-6">
                                    <div 
                                        className="absolute top-0 left-0 h-full bg-black rounded-full" 
                                        style={{ width: `${Math.min(100, Math.max(0, (Number(price) / safeCurrent) * 100))}%` }}
                                    ></div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max={safeCurrent} 
                                        step={safeCurrent > 100 ? 5 : 1}
                                        value={Number(price) || 0}
                                        onChange={handleSliderChange}
                                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div 
                                        className="absolute top-1/2 -mt-3.5 w-7 h-7 bg-white border-4 border-black rounded-full shadow-lg pointer-events-none transition-all"
                                        style={{ left: `calc(${Math.min(100, Math.max(0, (Number(price) / safeCurrent) * 100))}% - 14px)` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                        
                        <div className="relative">
                            <input 
                                type="number"
                                value={price}
                                onChange={handleInputChange}
                                placeholder="0"
                                className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl text-3xl font-black text-center focus:outline-none transition-all"
                                autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">
                                {symbol}
                            </span>
                        </div>
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
            </FadeIn>
        </div>
    );
}
