const fs = require('fs');
const path = require('path');

function getTranslationKeys(filename) {
    const filePath = path.join(__dirname, '../lib/translations', filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const regex = /^\s*([a-zA-Z0-9_]+)\s*:/gm;
    const keys = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
    return Array.from(keys);
}

try {
    const enKeys = getTranslationKeys('en.js');
    const ruKeys = getTranslationKeys('ru.js');
    const uaKeys = getTranslationKeys('ua.js');

    const allKeys = new Set([...enKeys, ...ruKeys, ...uaKeys]);
    
    let hasMissing = false;
    let missingLog = "\n=== MISSING TRANSLATIONS REPORT ===\n\n";

    for (const key of allKeys) {
        const inEn = enKeys.includes(key);
        const inRu = ruKeys.includes(key);
        const inUa = uaKeys.includes(key);

        if (!inEn || !inRu || !inUa) {
            hasMissing = true;
            missingLog += `Key: "${key}"\n`;
            if (!inEn) missingLog += `  ❌ Missing in EN\n`;
            if (!inRu) missingLog += `  ❌ Missing in RU\n`;
            if (!inUa) missingLog += `  ❌ Missing in UA\n`;
            missingLog += "\n";
        }
    }

    if (!hasMissing) {
        console.log("\n✅ All translations are perfectly synchronized!\n");
    } else {
        console.log(missingLog);
        console.log("⚠️  Please add the missing keys to the respective translation files.");
    }
} catch (err) {
    console.error("Error reading translation files:", err);
}
