/**
 * Translates text using our internal API route (proxies to Google)
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (ru, ua, en)
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLang) {
  if (!text) return "";
  
  try {
    const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, targetLang }),
    });

    if (!response.ok) {
        return text;
    }

    const data = await response.json();
    return data.text || text;
  } catch (error) {
    console.error("Translation helper error:", error);
    return text;
  }
}
