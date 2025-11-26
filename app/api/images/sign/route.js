import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supaAdmin } from "@/lib/supabaseAdmin";

function uidFromCookie(headers) {
  const cookie = headers.get("cookie") || "";
  const m = cookie.match(/app_session=([^;]+)/);
  if (!m) return null;
  try {
    // Verify token and extract 'sub' (user ID)
    const payload = jwt.verify(m[1], process.env.JWT_SECRET);
    return payload.sub || null;
  } catch (e) {
    console.error("JWT Verify Error:", e.message);
    return null;
  }
}

export async function POST(req) {
  const uid = uidFromCookie(req.headers);
  
  if (!uid) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const supa = supaAdmin();
  const { listingId, fileName } = await req.json();
  
  // Optional: Verify that 'uid' is the owner of 'listingId' if it's an edit
  // But for new listings (listingId might be temp or not created yet), we just ensure auth.
  
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
