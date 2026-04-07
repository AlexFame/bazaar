const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== "string") return null;

  const normalized = avatarUrl.trim();
  if (!normalized) return null;

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  if (!SUPABASE_URL) return normalized;

  // Telegram auth avatars are currently proxied into listing-images/avatars/...
  if (normalized.startsWith("avatars/")) {
    return `${SUPABASE_URL}/storage/v1/object/public/listing-images/${normalized}`;
  }

  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${normalized}`;
}
