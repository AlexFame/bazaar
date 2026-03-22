import { NextResponse } from 'next/server';
import { bot, handleStartCommand, handlePreCheckout, handleSuccessfulPayment } from '@/lib/bot';

export async function POST(req) {
  try {
    const update = await req.json();
    
    // Process known critical events explicitly to avoid Vercel Lambda freezing
    if (update.message?.text && update.message.text.startsWith('/start')) {
        await handleStartCommand(update.message);
    } else if (update.pre_checkout_query) {
        await handlePreCheckout(update.pre_checkout_query);
    } else if (update.message?.successful_payment) {
        await handleSuccessfulPayment(update.message);
    } else {
        // Fallback for background node-telegram-bot-api events
        if (bot) {
            bot.processUpdate(update);
            // 1-second delay hack to keep Lambda alive while background Promises resolve
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    // Always return 200 to Telegram so they don't retry endlessly
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}
