import { NextRequest, NextResponse } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { resolveTenant, TenantNotFoundError, TenantSuspendedError } from "./lib/tenantResolver";

const intlMiddleware = createMiddleware({
  locales: ['en', 'fr', 'de', 'si'],
  defaultLocale: 'en'
});

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Bypass resolver for internal APIs, Next.js assets, and public images
  if (
    url.pathname.startsWith("/api/tenant/resolve") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Handle API routes with tenant resolution only
  if (url.pathname.startsWith("/api")) {
    try {
      const origin = url.origin;
      const tenant = await resolveTenant({ hostname, origin });
      const requestHeaders = new Headers(request.headers);
      if (tenant.id) {
        requestHeaders.set("x-tenant-id", tenant.id);
      }
      requestHeaders.set("x-tenant-slug", tenant.slug);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      if (error instanceof TenantSuspendedError) {
        return new NextResponse("Account Suspended", { status: 403 });
      }
      if (error instanceof TenantNotFoundError) {
        return new NextResponse("Portal Not Found", { status: 404 });
      }
      return NextResponse.next();
    }
  }

  // Run locale routing middleware for page requests
  const response = intlMiddleware(request);

  // If next-intl redirects (e.g. to add the locale prefix), return the redirect immediately
  if (response && response.status >= 300 && response.status < 400) {
    return response;
  }

  try {
    const origin = url.origin;
    const tenant = await resolveTenant({ hostname, origin });

    if (tenant.isAdmin) {
      if (!url.pathname.startsWith("/api")) {
        const segments = url.pathname.split("/");
        const locales = ['en', 'fr', 'de', 'si'];
        const locale = locales.includes(segments[1]) ? segments[1] : 'en';
        url.pathname = `/${locale}/admin`;
        return NextResponse.rewrite(url);
      }
    }

    if (response) {
      if (tenant.id) {
        response.headers.set("x-tenant-id", tenant.id);
      }
      response.headers.set("x-tenant-slug", tenant.slug);
      return response;
    }

    const requestHeaders = new Headers(request.headers);
    if (tenant.id) {
      requestHeaders.set("x-tenant-id", tenant.id);
    }
    requestHeaders.set("x-tenant-slug", tenant.slug);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    if (error instanceof TenantSuspendedError) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Outfit', sans-serif;
              background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
              color: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              background: rgba(30, 41, 59, 0.7);
              backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              padding: 3rem;
              border-radius: 2rem;
              box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
              max-width: 480px;
              width: 90%;
              animation: fadeInUp 0.6s ease-out;
            }
            .icon {
              width: 80px;
              height: 80px;
              background: rgba(239, 68, 68, 0.1);
              border: 2px solid rgba(239, 68, 68, 0.4);
              color: #ef4444;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 2rem;
              font-size: 2.5rem;
              animation: pulse 2s infinite;
            }
            h1 {
              font-size: 2rem;
              font-weight: 800;
              margin-bottom: 1rem;
              background: linear-gradient(to right, #fca5a5, #ef4444);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            p {
              color: #94a3b8;
              font-size: 1rem;
              line-height: 1.6;
              margin-bottom: 2rem;
            }
            .btn {
              display: inline-block;
              background: #ef4444;
              color: white;
              padding: 0.8rem 2rem;
              border-radius: 9999px;
              text-decoration: none;
              font-weight: 600;
              transition: all 0.3s;
              box-shadow: 0 4px 14px 0 rgba(239, 68, 68, 0.4);
            }
            .btn:hover {
              background: #dc2626;
              transform: translateY(-2px);
              box-shadow: 0 6px 20px 0 rgba(239, 68, 68, 0.6);
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
              70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
              100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">⚠️</div>
            <h1>Account Suspended</h1>
            <p>Access to this portal has been suspended by the platform administrator. If you believe this is an error, please contact billing or customer support.</p>
            <a href="mailto:support@travelcompany.com" class="btn">Contact Support</a>
          </div>
        </body>
        </html>`,
        {
          status: 403,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    if (error instanceof TenantNotFoundError) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Portal Not Found</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Outfit', sans-serif;
              background: linear-gradient(135deg, #0f172a 0%, #0f172a 100%);
              color: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              max-width: 480px;
              width: 90%;
              animation: fadeInUp 0.6s ease-out;
            }
            .code {
              font-size: 6rem;
              font-weight: 800;
              line-height: 1;
              margin-bottom: 1.5rem;
              background: linear-gradient(to right, #3b82f6, #8b5cf6);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            h1 {
              font-size: 2rem;
              font-weight: 800;
              margin-bottom: 1rem;
            }
            p {
              color: #94a3b8;
              font-size: 1rem;
              line-height: 1.6;
              margin-bottom: 2rem;
            }
            .btn {
              display: inline-block;
              background: linear-gradient(to right, #3b82f6, #8b5cf6);
              color: white;
              padding: 0.8rem 2rem;
              border-radius: 9999px;
              text-decoration: none;
              font-weight: 600;
              transition: all 0.3s;
              box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px 0 rgba(59, 130, 246, 0.6);
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="code">404</div>
            <h1>Portal Not Found</h1>
            <p>The travel booking portal you are looking for does not exist or has been deactivated. Please double check the URL and try again.</p>
            <a href="https://travelcompany.com" class="btn">Back to Main Page</a>
          </div>
        </body>
        </html>`,
        {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    console.error("Middleware tenant resolution exception:", error);
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Error</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Outfit', sans-serif;
            background: #090d16;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .card {
            max-width: 480px;
            width: 90%;
            animation: fadeInUp 0.6s ease-out;
          }
          h1 {
            font-size: 2rem;
            font-weight: 800;
            color: #f43f5e;
            margin-bottom: 1rem;
          }
          p {
            color: #94a3b8;
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Internal Server Error</h1>
          <p>An unexpected error occurred while setting up your portal workspace. Please try reloading or contact support if the issue persists.</p>
        </div>
      </body>
      </html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

export const config = {
  matcher: [
    "/((?!api/tenant/resolve|_next/static|_next/image|favicon.ico|images).*)",
  ],
};
