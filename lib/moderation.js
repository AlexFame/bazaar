// Simple auto-moderation library

// Basic list of prohibited words (Russian & English)
// In a real app, this should be a much larger list or an external service.
const BAD_WORDS = [
    // English
    "scam", "fraud", "casino", "xxx", "porn", "sex",
    // Russian (transliteration and cyrillic placeholders for demo)
    "казино", "ставки", "порно", "секс", "интим",
    "наеб", "лохотрон", "крипта", "пирамида"
];

export function checkContent(text) {
    if (!text) return { safe: true, flagged: [] };
    
    const lowerText = text.toLowerCase();
    const flagged = [];

    BAD_WORDS.forEach(word => {
        if (lowerText.includes(word)) {
            flagged.push(word);
        }
    });

    return {
        safe: flagged.length === 0,
        flagged
    };
}

export function checkImage(file) {
    // 1. Check Size (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        return { safe: false, error: "Файл слишком большой (макс 5MB)" };
    }

    // 2. Check Type
    if (!file.type.startsWith("image/")) {
        return { safe: false, error: "Можно загружать только изображения" };
    }

    return { safe: true };
}
