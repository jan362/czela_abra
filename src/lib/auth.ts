import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getUserByUsername, verifyPassword, initializeUserStore } from "./user-store";

// ─── NextAuth Configuration ─────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: {
          label: "Uživatelské jméno",
          type: "text",
          placeholder: "admin",
        },
        password: {
          label: "Heslo",
          type: "password",
        },
      },
      async authorize(credentials) {
        // Validate credentials exist
        if (!credentials?.username || !credentials?.password) {
          console.log("[Auth] Missing username or password");
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

        // Ensure user store is initialized (safe to call multiple times)
        try {
          await initializeUserStore();
        } catch (error) {
          console.error("[Auth] Failed to initialize user store:", error);
          // Continue anyway - store might already exist
        }

        // Get user from store
        const user = await getUserByUsername(username);
        if (!user) {
          console.log(`[Auth] User not found: ${username}`);
          return null;
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          console.log(`[Auth] Invalid password for user: ${username}`);
          return null;
        }

        console.log(`[Auth] Successful login: ${username}`);

        // Return user object (will be stored in JWT)
        return {
          id: user.id,
          name: user.username,
          email: null, // Not used for credentials provider
        };
      },
    }),
  ],

  // Custom pages
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  // Session configuration
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Callbacks
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // Add user ID to session
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  // Debug mode in development
  debug: process.env.NODE_ENV === "development",
});
