import crypto from "crypto";
import { supaAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromCookie } from "@/lib/auth";
import { withRateLimit } from '@/lib/ratelimit';
import { imageSignSchema, validateBody } from '@/lib/validation';

async function imageSignHandler(req) {
  const uid = getUserIdFromCookie(req.headers);
  
  if (!uid) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const supa = supaAdmin();
  const body = await req.json();
  const v = validateBody(imageSignSchema, body);
  if (!v.ok) return v.error;
  const { listingId, fileName } = v.data;
  
  // Validate file extension (security: prevent non-image uploads)
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif'];
  const ext = (fileName || '').split('.').pop()?.toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    return new Response(JSON.stringify({ error: `File type not allowed. Allowed: ${allowedExtensions.join(', ')}` }), {
      status: 400,
    });
  }
  
  const key = `${listingId}/${crypto.randomUUID()}-${fileName}`;
  const { data, error } = await supa.storage
    .from("listing-images")
    .createSignedUploadUrl(key);
    
  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
    
  return new Response(
    JSON.stringify({ key, url: data.signedUrl, token: data.token }),
    { status: 200 }
  );
}

export const POST = withRateLimit(imageSignHandler, { limit: 10, window: '30 s' });
