import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const providers: any[] = [];

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  Credentials({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");

      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        throw new Error("No account found. Please sign up first.");
      }

      if (!user.isActive) {
        throw new Error("This account is disabled. Please contact support.");
      }

      if (!user.passwordHash) {
        throw new Error("This account uses Google sign-in. Please use Google login.");
      }

      const isValid = await compare(password, user.passwordHash);
      if (!isValid) {
        throw new Error("Invalid password.");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image ?? undefined,
      };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });

        if (existingUser && !existingUser.isActive) {
          return false;
        }
      } catch (error) {
        console.error("Database error during sign-in check:", error);
        // Allow sign-in to proceed even if DB check fails
        // The adapter will handle user creation
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id as string },
            select: { reputation: true },
          });
          token.reputation = dbUser?.reputation ?? 0;
        } catch (error) {
          console.error("Database error fetching reputation:", error);
          token.reputation = 0;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.reputation = (token.reputation as number) ?? 0;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.email) {
        try {
          await prisma.user.update({
            where: { email: user.email.toLowerCase() },
            data: { lastActiveAt: new Date() },
          });
        } catch (error) {
          console.error("Database error updating lastActiveAt:", error);
        }
      }
    },
  },
});
