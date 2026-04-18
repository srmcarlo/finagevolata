import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { loginSchema } from "@finagevolata/shared";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const passwordMatch = await compare(parsed.data.password, user.password);
        if (!passwordMatch) return null;

        // Auto-promote ADMIN_EMAILS on login (idempotent: only writes when role mismatches)
        const { isAdminEmail } = await import("./admin-bootstrap");
        let effectiveRole = user.role;
        if (isAdminEmail(user.email) && user.role !== "ADMIN") {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
          effectiveRole = "ADMIN";
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: effectiveRole,
        };
      },
    }),
    {
      id: "spid",
      name: "SPID",
      type: "oidc",
      issuer: "https://mock-spid.it", // Placeholder per demo
      clientId: "finagevolata-app",
      clientSecret: "mock-secret",
      authorization: { params: { scope: "openid profile email" } },
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name || `${profile.given_name} ${profile.family_name}`,
          email: profile.email,
          role: "COMPANY", // Default per SPID in questo contesto
        };
      },
      // In sviluppo non abbiamo un vero server OIDC, quindi usiamo mock
      // Per la demo non serve configurazione reale
    },
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
