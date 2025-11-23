
/**
 * Translates text using Google Translate API (free endpoint)
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (ru, ua, en)
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLang) {
  if (!text) return "";
  
  // Map our language codes to Google's
  const langMap = {
    "ua": "uk",
    "ru": "ru",
    "en": "en"
  };

  const target = langMap[targetLang] || "en";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Extract translated text from response structure
    // Response is like: [[["Translated text","Original text",...],...],...]
    if (data && data[0]) {
      return data[0].map(item => item[0]).join("");
    }
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}
