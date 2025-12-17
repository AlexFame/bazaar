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

/**
 * Check if text contains emoji characters
 * @param {string} text - Text to check
 * @returns {boolean} - True if text contains emojis
 */
export function hasEmoji(text) {
    if (!text) return false;
    
    // Regex to detect emoji characters
    // Covers most common emoji ranges
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/u;
    
    return emojiRegex.test(text);
}

/**
 * Validate listing title
 * @param {string} title - Title to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateTitle(title) {
    if (!title || !title.trim()) {
        return { valid: false, error: "Заголовок не может быть пустым" };
    }

    const trimmed = title.trim();

    // Min length check
    if (trimmed.length < 5) {
        return { valid: false, error: "Заголовок слишком короткий (минимум 5 символов)" };
    }

    // Max length check
    if (trimmed.length > 100) {
        return { valid: false, error: "Заголовок слишком длинный (максимум 100 символов)" };
    }

    // Check for excessive repeated characters (e.g., "aaaaaaa" or "123123123")
    const repeatedCharsRegex = /(.)\1{4,}/; // 5+ same chars in a row
    if (repeatedCharsRegex.test(trimmed)) {
        return { valid: false, error: "Слишком много повторяющихся символов в заголовке" };
    }

    // Check for excessive numbers (like "123213121231")
    const numberCount = (trimmed.match(/\d/g) || []).length;
    if (numberCount > trimmed.length * 0.6) {
        return { valid: false, error: "Слишком много цифр в заголовке" };
    }

    // Ensure at least 2 letters (avoid "12345" or "!!!")
    const letterCount = (trimmed.match(/[a-zA-Zа-яА-ЯёЁ]/g) || []).length;
    if (letterCount < 2) {
        return { valid: false, error: "Заголовок должен содержать хотя бы 2 буквы" };
    }

    // Check for excessive repetition of any single NON-LETTER character (e.g. "6" in "6п6п6м6р" is 50%)
    // Map char frequencies
    const charMap = {};
    for (let char of trimmed) {
        if (/[a-zA-Zа-яА-ЯёЁ\s]/.test(char)) continue; // Skip letters and spaces
        charMap[char] = (charMap[char] || 0) + 1;
    }
    
    // Check if any non-letter symbol appears > 40% of the time (and length > 5)
    if (trimmed.length > 5) {
        for (let char in charMap) {
            if (charMap[char] > trimmed.length * 0.4) {
                 return { valid: false, error: "Подозрительное содержание: слишком много повторяющихся символов" };
            }
        }
    }

    return { valid: true };
}

/**
 * Validate listing description
 * @param {string} description - Description to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateDescription(description) {
    if (!description || !description.trim()) {
        return { valid: false, error: "Описание не может быть пустым" };
    }

    const trimmed = description.trim();

    // Min length check
    if (trimmed.length < 10) {
        return { valid: false, error: "Описание слишком короткое (минимум 10 символов)" };
    }

    // Max length check
    if (trimmed.length > 2000) {
        return { valid: false, error: "Описание слишком длинное (максимум 2000 символов)" };
    }

    return { valid: true };
}

/**
 * Validate listing price
 * @param {number} price - Price to validate
 * @param {string} type - Listing type (buy, sell, service, free)
 * @returns {object} - { valid: boolean, error: string }
 */
export function validatePrice(price, type) {
    const numPrice = Number(price);

    // Check if price is a valid number
    if (isNaN(numPrice) || numPrice < 0) {
        return { valid: false, error: "Некорректная цена" };
    }

    // Free listings must have price 0
    if (type === "free" && numPrice !== 0) {
        return { valid: false, error: "Бесплатные объявления должны иметь цену 0€" };
    }

    // Non-free listings must have price > 0
    if (type !== "free" && numPrice === 0) {
        return { valid: false, error: "Укажите цену больше 0€" };
    }

    // Max price limits by type
    const maxPrices = {
        buy: 50000,
        sell: 50000,
        service: 5000,
        free: 0
    };

    const maxPrice = maxPrices[type] || 50000;

    if (numPrice > maxPrice) {
        return { valid: false, error: `Максимальная цена для этого типа: ${maxPrice}€` };
    }

    return { valid: true };
}

/**
 * Validate comment/review text
 * @param {string} text - Comment or review text to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateComment(text) {
    if (!text || !text.trim()) {
        return { valid: false, error: "Текст не может быть пустым" };
    }

    const trimmed = text.trim();

    // Min length check
    if (trimmed.length < 2) {
        return { valid: false, error: "Текст слишком короткий (минимум 2 символа)" };
    }

    // Max length check
    if (trimmed.length > 500) {
        return { valid: false, error: "Текст слишком длинный (максимум 500 символов)" };
    }

    // Check for bad words
    const contentCheck = checkContent(trimmed);
    if (!contentCheck.safe) {
        return { valid: false, error: "Текст содержит запрещенные слова" };
    }

    // Check for excessive repeated characters
    const repeatedCharsRegex = /(.)\1{9,}/; // 10+ same chars in a row
    if (repeatedCharsRegex.test(trimmed)) {
        return { valid: false, error: "Слишком много повторяющихся символов" };
    }

    // Check for excessive numbers (spam protection) - Relaxed for prices
    const numberCount = (trimmed.match(/\d/g) || []).length;
    if (trimmed.length > 20 && numberCount > trimmed.length * 0.9) {
        return { valid: false, error: "Слишком много цифр в тексте" };
    }

    // Check for URLs (basic spam protection)
    const urlRegex = /(https?:\/\/|www\.)/i;
    if (urlRegex.test(trimmed)) {
        return { valid: false, error: "Ссылки запрещены" };
    }

    return { valid: true };
}
