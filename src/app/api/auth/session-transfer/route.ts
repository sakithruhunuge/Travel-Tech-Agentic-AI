import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target") || "/dashboard";
  
  // Get the session token from the cookies
  const tokenCookie = request.cookies.get("next-auth.session-token") || request.cookies.get("__Secure-next-auth.session-token");
  
  if (!tokenCookie) {
    console.error("[SessionTransfer] No session token found on main domain");
    return NextResponse.redirect(new URL("/login?error=SessionTransferFailed", request.url));
  }
  
  try {
    const targetUrl = new URL(target);
    // Redirect to the subdomain session-sync endpoint
    const syncUrl = new URL("/api/auth/session-sync", targetUrl.origin);
    syncUrl.searchParams.set("token", tokenCookie.value);
    syncUrl.searchParams.set("target", target);
    
    return NextResponse.redirect(syncUrl);
  } catch (error) {
    console.error("[SessionTransfer] Invalid target URL:", target);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
