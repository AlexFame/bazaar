/**
 * Translates text using our internal API route (proxies to Google)
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (ru, ua, en)
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLang) {
  if (!text) return "";
  
  console.log("📡 Translation helper called:", { text: text.substring(0, 50), targetLang });
  
  try {
    const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, targetLang }),
    });

    console.log("📥 API response status:", response.status);

    if (!response.ok) {
        console.error("❌ API error:", response.status);
        return text;
    }

    const data = await response.json();
    console.log("✨ Translated result:", data.text?.substring(0, 50));
    return data.text || text;
  } catch (error) {
    console.error("Translation helper error:", error);
    return text;
  }
}
