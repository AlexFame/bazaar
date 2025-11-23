
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { text, targetLang } = await request.json();

    console.log("🔧 Translation API called:", { textLength: text?.length, targetLang });

    if (!text) {
      return NextResponse.json({ text: "" });
    }

    // Map our language codes to Google's
    const langMap = {
      "ua": "uk",
      "ru": "ru",
      "en": "en"
    };

    const target = langMap[targetLang] || "en";

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    
    console.log("🌐 Calling Google Translate API...");
    const response = await fetch(url);
    
    if (!response.ok) {
        console.error("❌ Google API error:", response.status);
        throw new Error(`Google API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // Extract translated text
    // Response structure: [[["Translated text","Original text",...],...],...]
    let translatedText = text;
    if (data && data[0]) {
      translatedText = data[0].map(item => item[0]).join("");
    }

    console.log("✅ Translation successful:", translatedText.substring(0, 50));

    return NextResponse.json({ text: translatedText });

  } catch (error) {
    console.error("Translation API error:", error);
    // Return original text on error to not break UI
    return NextResponse.json({ text: "" }, { status: 500 });
  }
}
