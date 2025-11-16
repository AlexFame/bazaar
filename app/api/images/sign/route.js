import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supaAdmin } from "@/lib/supabaseAdmin";

function uidFromCookie(headers) {
  const cookie = headers.get("cookie") || "";
  const m = cookie.match(/app_session=([^;]+)/);
  if (!m) return null;
  try {
    return jwt.verify(m[1], process.env.JWT_SECRET).uid;
  } catch {
    return null;
  }
}

export async function POST(req) {
  const uid = "dev-user";
  const supa = supaAdmin();
  const { listingId, fileName } = await req.json();
  const key = `${listingId}/${crypto.randomUUID()}-${fileName}`;
  const { data, error } = await supa.storage
    .from("listing-images")
    .createSignedUploadUrl(key);
  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  // optionally create DB record after upload in a webhook; for MVP we return just signed url/token
  return new Response(
    JSON.stringify({ key, url: data.signedUrl, token: data.token }),
    { status: 200 }
  );
}
