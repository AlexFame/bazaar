
import crypto from 'crypto';

/**
 * Validates the Telegram WebApp initData string
 * @param {string} initData - The raw initData string from Telegram WebApp
 * @param {string} botToken - The Telegram Bot Token
 * @returns {object|null} - The user object if valid, null otherwise
 */
export function validateTelegramWebAppData(initData, botToken) {
  if (!initData) return null;

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  if (!hash) return null;

  urlParams.delete('hash');
  
  const dataToCheck = [...urlParams.entries()]
    .map(([key, value]) => key + '=' + value)
    .sort()
    .join('\n');
    
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const _hash = crypto.createHmac('sha256', secretKey).update(dataToCheck).digest('hex');
  
  if (hash !== _hash) return null;
  
  const userStr = urlParams.get('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}
