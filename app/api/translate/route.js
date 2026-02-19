
import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/security";

// 20 requests per minute per IP
const isAllowed = createRateLimiter(20, 60 * 1000);

export async function POST(request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!isAllowed(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { text, targetLang } = await request.json();

    if (!text) {
      return NextResponse.json({ text: "" });
    }

    // Limit text length to prevent abuse
    const safeText = String(text).slice(0, 2000);

    // Map our language codes to Google's
    const langMap = {
      "ua": "uk",
      "ru": "ru",
      "en": "en"
    };

    const target = langMap[targetLang] || "en";

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(safeText)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Google API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // Extract translated text
    let translatedText = safeText;
    if (data && data[0]) {
      translatedText = data[0].map(item => item[0]).join("");
    }

    return NextResponse.json({ text: translatedText });

  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json({ text: "" }, { status: 500 });
  }
}
