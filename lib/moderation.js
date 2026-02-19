import { COMMON_ROOTS } from './valid_words';

// Basic list of prohibited words
const BAD_WORDS = [
    "scam", "fraud", "casino", "xxx", "porn", "sex",
    "казино", "ставки", "порно", "секс", "интим",
    "наеб", "лохотрон", "крипта", "пирамида"
];

const GIBBERISH_REGEX_CLUSTERS = /[bcdfghjklmnpqrstvwxzбвгджзйклмнпрстфхцчшщ]{7,}/i;
const VOWELS_REGEX = /[aeiouyаеёиоуыэюяіїє]/i;
const RARE_CHARS_REGEX = /[щшъыїєґ]/gi;

export function checkContent(text) {
    if (!text) return { safe: true, flagged: [] };

    // 1. Long consonant clusters (safe fallback)
    if (GIBBERISH_REGEX_CLUSTERS.test(text)) return { safe: false, flagged: ['gibberish_cluster'] };

    // 2. Word Analysis
    const words = text.split(/\s+/);
    for (const word of words) {
        const cleanWord = word.replace(/[^\wа-яёїієґ]/gi, '');
        if (cleanWord.length > 4) {
             // Vowel Check
             if (!VOWELS_REGEX.test(cleanWord)) {
                return { safe: false, flagged: ['gibberish_no_vowels'] };
            }
             // Density Check (Rare letters)
            const rareMatches = cleanWord.match(RARE_CHARS_REGEX);
            if (rareMatches) {
                const ratio = rareMatches.length / cleanWord.length;
                if (ratio > 0.45) return { safe: false, flagged: ['gibberish_density'] };
            }
        }
    }

    // 3. DICTIONARY CHECK
    if (text.length > 8) {
        const lower = text.toLowerCase();
        const hasKnownRoot = COMMON_ROOTS.some(root => lower.includes(root));
        
        // Strict "Unknown Word" penalty for single-word titles > 10 chars
        if (words.length === 1 && text.length > 10 && !hasKnownRoot) {
             return { safe: false, flagged: ['gibberish_unknown_long_word'] };
        }
    }

    const lowerText = text.toLowerCase();
    const flagged = [];
    BAD_WORDS.forEach(word => {
        if (lowerText.includes(word)) flagged.push(word);
    });
    return { safe: flagged.length === 0, flagged };
}

/**
 * Check if text contains emoji characters
 * @param {string} text
 * @returns {boolean}
 */
export function hasEmoji(text) {
    if (!text) return false;
    // Match common emoji ranges
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/u;
    return emojiRegex.test(text);
}

// ... URL Regex ...
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|ru|net|org|io|me|xyz|ua)[^\s]*)/i;

/**
 * Validate listing title
 * @param {string} title - Title to validate
 * @returns {object} - { valid: boolean, errorKey: string }
 */
export function validateTitle(title) {
    if (!title || !title.trim()) {
        return { valid: false, errorKey: "validation_title_empty" };
    }

    const trimmed = title.trim();

    // Min length check
    if (trimmed.length < 5) {
        return { valid: false, errorKey: "validation_title_short" };
    }

    // Max length check
    if (trimmed.length > 100) {
        return { valid: false, errorKey: "validation_title_long" };
    }

    // URL Check (Strict)
    if (URL_REGEX.test(trimmed)) {
        return { valid: false, errorKey: "validation_no_links" }; // Create this key if missing
    }

    // Check for excessive repeated characters (e.g., "aaaaaaa" or "123123123")
    const repeatedCharsRegex = /(.)\1{4,}/; // 5+ same chars in a row
    if (repeatedCharsRegex.test(trimmed)) {
        return { valid: false, errorKey: "validation_title_repeated_chars" };
    }

    // Check for excessive numbers (like "123213121231")
    const numberCount = (trimmed.match(/\d/g) || []).length;
    if (numberCount > trimmed.length * 0.6) {
        return { valid: false, errorKey: "validation_title_too_many_numbers" };
    }

    // Ensure at least 2 letters (avoid "12345" or "!!!")
    const letterCount = (trimmed.match(/[a-zA-Zа-яА-ЯёЁ]/g) || []).length;
    if (letterCount < 2) {
        return { valid: false, errorKey: "validation_title_not_enough_letters" };
    }

    // Check for excessive repetition of any single NON-LETTER character (e.g. "6" in "6п6п6м6р" is 50%)
    const charMap = {};
    for (let char of trimmed) {
        if (/[a-zA-Zа-яА-ЯёЁ\s]/.test(char)) continue; // Skip letters and spaces
        charMap[char] = (charMap[char] || 0) + 1;
    }
    
    if (trimmed.length > 5) {
        for (let char in charMap) {
            if (charMap[char] > trimmed.length * 0.4) {
                 return { valid: false, errorKey: "validation_title_suspicious" };
            }
        }
    }

    // Check for "Caps Lock" spam
    if (trimmed.length > 10) {
        const letters = trimmed.match(/[a-zA-Zа-яА-ЯёЁ]/g) || [];
        if (letters.length > 0) {
            const caps = trimmed.match(/[A-ZА-ЯЁ]/g) || [];
            if (caps.length / letters.length > 0.9) { // Increased from 0.8
                 return { valid: false, errorKey: "validation_title_caps" };
            }
        }
    }

    // Gibberish Check (Smart)
    const contentCheck = checkContent(trimmed);
    if (!contentCheck.safe && (contentCheck.flagged.includes('gibberish_cluster') || contentCheck.flagged.includes('gibberish_no_vowels'))) {
         return { valid: false, errorKey: "validation_title_gibberish" };
    }

    return { valid: true };
}

/**
 * Validate listing description
 * @param {string} description - Description to validate
 * @returns {object} - { valid: boolean, errorKey: string }
 */
export function validateDescription(description) {
    if (!description || !description.trim()) {
        return { valid: false, errorKey: "validation_desc_empty" };
    }

    const trimmed = description.trim();

    // Min length check
    if (trimmed.length < 10) {
        return { valid: false, errorKey: "validation_desc_short" };
    }

    // Max length check
    if (trimmed.length > 2000) {
        return { valid: false, errorKey: "validation_desc_long" };
    }

    // URL Check removed — URLs are common in descriptions (contact links, Telegram profiles, etc.)
    // Title-level URL check remains in validateTitle().

    // Check for excessive repeated characters (spam)
    const repeatedCharsRegex = /(.)\1{9,}/; 
    if (repeatedCharsRegex.test(trimmed)) {
        return { valid: false, errorKey: "validation_desc_spam" };
    }

    return { valid: true };
}

/**
 * Validate listing price
 * @param {number} price - Price to validate
 * @param {string} type - Listing type (buy, sell, service, free)
 * @returns {object} - { valid: boolean, errorKey: string, params: object }
 */
export function validatePrice(price, type) {
    const numPrice = Number(price);

    // Check if price is a valid number
    if (isNaN(numPrice) || numPrice < 0) {
        return { valid: false, errorKey: "validation_price_invalid" };
    }

    // Free listings must have price 0
    if (type === "free" && numPrice !== 0) {
        return { valid: false, errorKey: "validation_price_free_must_be_0" };
    }

    // Non-free listings must have price > 0
    if (type !== "free" && numPrice === 0) {
        return { valid: false, errorKey: "validation_price_must_be_positive" };
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
        return { valid: false, errorKey: "validation_price_max_exceeded", params: { maxPrice } };
    }

    return { valid: true };
}

/**
 * Validate comment/review text
 * @param {string} text - Comment or review text to validate
 * @returns {object} - { valid: boolean, errorKey: string }
 */
export function validateComment(text) {
    if (!text || !text.trim()) {
        return { valid: false, errorKey: "validation_comment_empty" };
    }

    const trimmed = text.trim();

    // Min length check
    if (trimmed.length < 2) {
        return { valid: false, errorKey: "validation_comment_short" };
    }

    // Max length check
    if (trimmed.length > 500) {
        return { valid: false, errorKey: "validation_comment_long" };
    }

    // Check for bad words
    const contentCheck = checkContent(trimmed);
    if (!contentCheck.safe) {
        return { valid: false, errorKey: "validation_comment_bad_words" };
    }

    // Check for excessive repeated characters
    const repeatedCharsRegex = /(.)\1{9,}/; // 10+ same chars in a row
    if (repeatedCharsRegex.test(trimmed)) {
        return { valid: false, errorKey: "validation_comment_repeated_chars" };
    }

    // Check for excessive numbers (spam protection) - Relaxed for prices
    const numberCount = (trimmed.match(/\d/g) || []).length;
    if (trimmed.length > 20 && numberCount > trimmed.length * 0.9) {
        return { valid: false, errorKey: "validation_comment_too_many_numbers" };
    }

    // Check for URLs (basic spam protection)
    const urlRegex = /(https?:\/\/|www\.)/i;
    if (urlRegex.test(trimmed)) {
        return { valid: false, errorKey: "validation_comment_urls" };
    }

    return { valid: true };
}
