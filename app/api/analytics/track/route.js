import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { listingId, eventType, eventData } = await request.json();

    // Validate input
    if (!listingId || !eventType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes = ['view', 'contact_click', 'message_click', 'favorite_add', 'share'];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS for inserting events
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Get user agent from headers
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert analytics event
    const { error } = await supabase
      .from('listing_analytics_events')
      .insert({
        listing_id: listingId,
        event_type: eventType,
        event_data: eventData || {},
        user_agent: userAgent,
      });

    if (error) {
      console.error('Analytics tracking error:', error);
      return NextResponse.json(
        { error: 'Failed to track event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
