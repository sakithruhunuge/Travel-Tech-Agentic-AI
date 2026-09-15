import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import SuperAdmin from "@/models/SuperAdmin";
import { headers } from "next/headers";
import { resolveTenant } from "@/lib/tenantResolver";
import mongoose from "mongoose";

// Augment NextAuth interfaces to include role, tenantId, and slug in session & JWT
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: "customer" | "tenant_admin" | "super_admin";
      tenantId: string | null;
      slug: string | null;
      provider?: string;
      createdAt?: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: "customer" | "tenant_admin" | "super_admin";
    tenantId: string | null;
    slug: string | null;
    provider?: string;
    createdAt?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "customer" | "tenant_admin" | "super_admin";
    tenantId: string | null;
    slug: string | null;
    provider?: string;
    createdAt?: string | null;
  }
}

const useSecureCookies = process.env.NODE_ENV === "production";
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const cookieDomain = useSecureCookies
  ? `.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || "travelcompany.com"}`
  : ".localhost";

function getOriginalHostname(requestHeaders: Headers): string | null {
  const cookieStr = requestHeaders.get("cookie") || "";
  const callbackUrlCookie = cookieStr
    .split("; ")
    .find((row) => row.startsWith("next-auth.callback-url=") || row.startsWith("__Secure-next-auth.callback-url="));
  if (callbackUrlCookie) {
    try {
      const encodedUrl = callbackUrlCookie.split("=")[1];
      const decodedUrl = decodeURIComponent(encodedUrl);
      const urlObj = new URL(decodedUrl);

      // Extract original tenant host if callbackUrl contains target query parameter
      const targetParam = urlObj.searchParams.get("target");
      if (targetParam) {
        try {
          return new URL(targetParam).host;
        } catch { }
      }
      return urlObj.host;
    } catch { }
  }
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await dbConnect();

        const hostname = headers().get("host") || "";
        const tenant = await resolveTenant({ hostname });

        // 1. Resolve SuperAdmin context if authenticated under the Admin portal or superadmin email
        const normalizedEmail = credentials.email.toLowerCase().trim();
        const superAdminRecord = await SuperAdmin.findOne({ email: normalizedEmail });
        const isSuperAdmin = tenant.isAdmin || !!superAdminRecord || normalizedEmail === "admin@travelcompany.com";
        if (isSuperAdmin) {
          if (process.env.NODE_ENV === "development") {
            const adminCount = await SuperAdmin.countDocuments();
            if (adminCount === 0) {
              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash("superadminpassword", salt);
              await SuperAdmin.create({
                name: "System Super Admin",
                email: "admin@travelcompany.com",
                password: hashedPassword,
              });
            }
          }
          const superAdmin = superAdminRecord || await SuperAdmin.findOne({
            email: normalizedEmail,
          });

          if (!superAdmin) {
            throw new Error("No super administrator found with this email");
          }

          const isValidPassword = await bcrypt.compare(credentials.password, superAdmin.password || "");
          if (!isValidPassword) {
            throw new Error("Invalid password");
          }

          return {
            id: superAdmin._id.toString(),
            name: superAdmin.name,
            email: superAdmin.email,
            role: "super_admin",
            tenantId: null,
            slug: "admin",
            provider: "credentials",
          };
        }

        // 2. Resolve Tenant-Scoped User
        const user = await User.findOne({
          tenantId: tenant.id!, // Non-null assertion since it is false for tenant.isAdmin
          email: credentials.email.toLowerCase().trim(),
        });

        if (!user) {
          throw new Error("No user found with this email under this portal");
        }

        if (user.provider !== "credentials" || !user.password) {
          throw new Error("This account is registered using Google OAuth. Please sign in with Google.");
        }

        if (user.status === "suspended") {
          throw new Error("Your account has been suspended by the administrator");
        }

        if (user.status === "pending") {
          throw new Error("Your account is pending activation");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image || null,
          role: user.role,
          tenantId: tenant.id,
          slug: tenant.slug,
          provider: user.provider,
          createdAt: user.createdAt?.toISOString(),
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        try {
          await dbConnect();
          const requestHeaders = headers();
          const hostname = getOriginalHostname(requestHeaders) || requestHeaders.get("host") || "";
          const tenant = await resolveTenant({ hostname });

          if (tenant.isAdmin) {
            const superAdmin = await SuperAdmin.findOne({ email: user.email });
            if (!superAdmin) {
              console.warn("Unauthorized attempt to login as SuperAdmin via Google:", user.email);
              return false;
            }
            return true;
          }

          let existingUser = await User.findOne({
            tenantId: tenant.id!,
            email: user.email,
          });

          if (!existingUser) {
            // Check if user already exists by email under any tenant
            const existingByEmail = await User.findOne({ email: user.email });
            if (existingByEmail && !existingByEmail.tenantId) {
              existingByEmail.tenantId = new mongoose.Types.ObjectId(tenant.id!);
              await existingByEmail.save();
              existingUser = existingByEmail;
            } else if (!existingByEmail) {
              // Register as Customer under the active tenant
              await User.create({
                name: user.name || user.email.split("@")[0],
                email: user.email,
                image: user.image || "",
                provider: "google",
                tenantId: tenant.id!,
                role: "customer",
                status: "active",
              });
            }
          } else if (existingUser.status === "suspended" || existingUser.status === "pending") {
            return false;
          }
          return true;
        } catch (error) {
          console.warn("Error in NextAuth signIn Google callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      const requestHeaders = headers();
      const hostname = getOriginalHostname(requestHeaders) || requestHeaders.get("host") || "";

      if (user) {
        // Initial sign-in: transfer database fields to the JWT token payload
        const u = user as any;
        token.id = u.id || token.sub || "";
        token.provider = u.provider || (account?.provider ? account.provider : "credentials");
        token.createdAt = u.createdAt || null;
        if (user.name) token.name = user.name;
        if (user.email) token.email = user.email;

        try {
          await dbConnect();
          const tenant = await resolveTenant({ hostname });

          const isSuperAdminUser =
            tenant.isAdmin ||
            u.role === "super_admin" ||
            (token.email && (await SuperAdmin.findOne({ email: token.email.toLowerCase().trim() })));

          if (isSuperAdminUser) {
            token.role = "super_admin";
            token.tenantId = null;
            token.slug = "admin";
          } else {
            let dbUser = await User.findOne({
              tenantId: tenant.id!,
              email: token.email,
            });
            if (!dbUser && token.email) {
              dbUser = await User.findOne({ email: token.email });
              if (dbUser && !dbUser.tenantId) {
                dbUser.tenantId = new mongoose.Types.ObjectId(tenant.id!);
                await dbUser.save();
              }
            }
            if (dbUser) {
              token.id = dbUser._id.toString();
              token.provider = dbUser.provider;
              token.role = dbUser.role;
              token.tenantId = tenant.id;
              token.slug = tenant.slug;
              token.createdAt = dbUser.createdAt?.toISOString();
              if (dbUser.name) token.name = dbUser.name;
            } else {
              token.role = u.role || "customer";
              token.tenantId = tenant.id;
              token.slug = tenant.slug;
            }
          }
        } catch (err) {
          console.warn("Error resolving tenant in initial jwt sign-in callback:", err);
          token.role = u.role || null;
          token.tenantId = u.tenantId || null;
          token.slug = u.slug || null;
        }
      } else if (token.email) {
        // Subsequent lookups: check and sync user state with the database
        try {
          await dbConnect();
          const requestHeaders = headers();
          const hostname = getOriginalHostname(requestHeaders) || requestHeaders.get("host") || "";
          const tenant = await resolveTenant({ hostname });

          const superAdmin = await SuperAdmin.findOne({ email: token.email.toLowerCase().trim() });
          if (superAdmin || tenant.isAdmin || token.role === "super_admin") {
            if (superAdmin) {
              token.id = superAdmin._id.toString();
              token.role = "super_admin";
              token.tenantId = null;
              token.slug = "admin";
            } else if (token.role === "super_admin") {
              token.role = "super_admin";
              token.tenantId = null;
              token.slug = "admin";
            }
          } else {
            let dbUser = await User.findOne({
              tenantId: tenant.id!,
              email: token.email,
            });
            if (!dbUser) {
              dbUser = await User.findOne({ email: token.email });
              if (dbUser && !dbUser.tenantId) {
                dbUser.tenantId = new mongoose.Types.ObjectId(tenant.id!);
                await dbUser.save();
              }
            }
            if (dbUser) {
              token.id = dbUser._id.toString();
              token.provider = dbUser.provider;
              token.role = dbUser.role;
              token.tenantId = tenant.id;
              token.slug = tenant.slug;
              token.createdAt = dbUser.createdAt?.toISOString();
              if (dbUser.name) token.name = dbUser.name;
            } else {
              // Auto-provision user record for this tenant workspace if missing
              try {
                const newUser = await User.create({
                  name: token.name || (token.email ? token.email.split("@")[0] : "Customer"),
                  email: token.email,
                  image: token.picture || "",
                  provider: "google",
                  tenantId: tenant.id!,
                  role: "customer",
                  status: "active",
                });
                token.id = newUser._id.toString();
                token.role = "customer";
                token.tenantId = tenant.id;
                token.slug = tenant.slug;
              } catch (e) {
                token.tenantId = tenant.id;
                token.slug = tenant.slug;
                if (!token.role) token.role = "customer";
              }
            }
          }
        } catch (error) {
          console.warn("Error refreshing user token in NextAuth JWT callback:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Map properties from JWT token payload to the active session object
      const sessionUser = session.user as any;
      if (sessionUser) {
        sessionUser.id = token.id;
        sessionUser.provider = token.provider;
        sessionUser.createdAt = token.createdAt || null;
        sessionUser.role = token.role;
        sessionUser.tenantId = token.tenantId;
        sessionUser.slug = token.slug;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 1. If it's a relative URL, resolve against the default baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // 2. If it's an absolute URL, check if the host is trusted
      try {
        const urlObj = new URL(url);
        const baseObj = new URL(baseUrl);

        const hostname = urlObj.hostname;
        const baseHostname = baseObj.hostname;
        const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "travelcompany.com";

        // Allow if same domain or subdomain as NEXTAUTH_URL (e.g. localhost, *.localhost)
        if (hostname === baseHostname || hostname.endsWith("." + baseHostname)) {
          return url;
        }

        // Allow localhost and local subdomains explicitly
        if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1") {
          return url;
        }

        // Allow production main domain and subdomains
        if (hostname === mainDomain || hostname.endsWith("." + mainDomain)) {
          return url;
        }
      } catch {
        // Fallback for invalid URLs
      }

      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};
