import { NextResponse } from 'next/server';
import { bot } from '@/lib/bot';

export async function POST(req) {
  try {
    const update = await req.json();
    
    // Process the update with the bot instance
    if (bot) {
        bot.processUpdate(update);
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    // Always return 200 to Telegram so they don't retry endlessly
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}
