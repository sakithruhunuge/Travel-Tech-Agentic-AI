import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const maxDuration = 120; // 120 seconds for long agent pipelines

export async function POST(req: NextRequest) {
  try {
    // 1. Session check via NextAuth
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required to generate itineraries." },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json();

    // Map camelCase to snake_case for FastAPI ItineraryRequest
    const payload = {
      destination: body.destination || "Galle",
      travel_dates: body.travel_dates || body.travelDates || "Upcoming Dates",
      duration_days: Number(body.duration_days ?? body.durationDays ?? 5),
      budget_usd: Number(body.budget_usd ?? body.budgetUsd ?? 500),
      party_size: Number(body.party_size ?? body.partySize ?? 2),
      interests: Array.isArray(body.interests) ? body.interests : [],
      custom_vibe: body.custom_vibe ?? body.customVibe ?? "",
    };

    const agentApiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";
    const endpoint = `${agentApiUrl.replace(/\/+$/, "")}/api/v1/generate-itinerary`;

    // 3. Forward request with 120-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.detail || data.error || "Agent backend encountered an error." },
          { status: response.status }
        );
      }

      return NextResponse.json(data, { status: 200 });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "Agent pipeline timed out after 120 seconds." },
          { status: 504 }
        );
      }
      return NextResponse.json(
        {
          error:
            "FastAPI agent service unavailable. Ensure the backend is running at " +
            agentApiUrl,
          details: fetchErr.message,
        },
        { status: 503 }
      );
    }
  } catch (err: any) {
    console.error("API /api/generate-itinerary error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
