const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx')) {
            callback(dirPath);
        }
    });
}

const dirsToScan = [
    path.join(__dirname, '../components'),
    path.join(__dirname, '../app'),
    path.join(__dirname, '../lib')
];

let filesWithUntranslated = new Set();
const cyrillicRegex = /[А-Яа-яЁёІіЇїЄє]/;

dirsToScan.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    walkDir(dir, (filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        let hasUntranslated = false;
        let inCommentBlock = false;

        lines.forEach(line => {
            const tLine = line.trim();
            if (tLine.startsWith('/*')) inCommentBlock = true;
            if (tLine.endsWith('*/')) { inCommentBlock = false; return; }
            if (inCommentBlock) return;
            if (tLine.startsWith('//') || tLine.startsWith('*') || tLine.startsWith('{/*')) return;
            if (tLine.includes('eslint-disable')) return;
            if (tLine.includes('console.')) return;
            
            if (cyrillicRegex.test(line)) {
                // If it HAS cyrillic, but NO `t(`, NO `lang ===`, NO translation exports
                if (!line.includes('t(') && !line.includes('t (') && !line.includes('lang ===') && !filePath.includes('translations/')) {
                    // Check if the cyrillic is only inside a trailing comment: e.g. `const x = 1; // Комментарий`
                    const codePart = line.split('//')[0];
                    if (cyrillicRegex.test(codePart)) {
                        hasUntranslated = true;
                    }
                }
            }
        });

        if (hasUntranslated) {
            filesWithUntranslated.add(path.relative(path.join(__dirname, '..'), filePath));
        }
    });
});

console.log(Array.from(filesWithUntranslated).join('\n'));
