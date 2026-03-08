import jwt from 'jsonwebtoken';

/**
 * Extract and verify user info from the app_session HttpOnly cookie.
 * @param {Headers} headers - Request headers
 * @returns {{ id: string, tg_user_id?: number } | null}
 */
export function getUserFromCookie(headers) {
  const cookie = headers.get('cookie') || '';
  const match = cookie.match(/app_session=([^;]+)/);
  if (!match) return null;

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET);
    return {
      id: payload.sub || null,
      tg_user_id: payload.user_metadata?.tg_user_id || null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Shorthand: get just the user ID string from cookie.
 * @param {Headers} headers - Request headers
 * @returns {string | null}
 */
export function getUserIdFromCookie(headers) {
  const user = getUserFromCookie(headers);
  return user?.id || null;
}
