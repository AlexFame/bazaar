import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRateLimit } from "@/lib/ratelimit";
import { productAnalyticsTrackSchema, validateBody } from "@/lib/validation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole =
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function trackProductHandler(request) {
  try {
    const body = await request.json();
    const v = validateBody(productAnalyticsTrackSchema, body);
    if (!v.ok) return v.error;

    const { eventType, eventData } = v.data;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    const userAgent = request.headers.get("user-agent") || "unknown";

    const { error } = await supabase.from("product_analytics_events").insert({
      event_type: eventType,
      event_data: eventData || {},
      user_agent: userAgent,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withRateLimit(trackProductHandler, {
  limit: 60,
  window: "30 s",
});
