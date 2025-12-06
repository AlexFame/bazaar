"use client";
import React, { useState } from 'react';
import FadeIn from "@/components/FadeIn";

export default function MakeOfferModal({ isOpen, onClose, onSubmit, listingTitle, symbol = '€' }) {
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!price || isNaN(price) || Number(price) <= 0) {
            alert("Пожалуйста, введите корректную цену");
            return;
        }
        setLoading(true);
        await onSubmit(Number(price));
        setLoading(false);
        setPrice('');
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
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                        🔖
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Предложить цену</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{listingTitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                            Ваша цена ({symbol})
                        </label>
                        <input 
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="Например: 50"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black transition-all"
                            autoFocus
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 bg-black text-white rounded-xl font-bold text-base hover:bg-gray-800 transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {loading ? 'Отправка...' : 'Отправить предложение'}
                    </button>
                    
                    <p className="text-xs text-center text-gray-400">
                        Продавец получит уведомление и сможет принять или отклонить ваше предложение.
                    </p>
                </form>
            </div>
            </FadeIn>
        </div>
    );
}
