import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const target = searchParams.get("target") || "/dashboard";
  
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=NoSyncToken", request.url));
  }
  
  const response = NextResponse.redirect(new URL(target, request.url));
  
  const useSecureCookies = process.env.NODE_ENV === "production";
  const cookieName = useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token";
  
  // Set the session cookie for the current host-only domain
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecureCookies,
  });
  
  return response;
}
