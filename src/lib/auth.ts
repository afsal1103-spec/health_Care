import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query, toCamelCase } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await query(
            "SELECT * FROM users WHERE email = $1 AND is_active = true",
            [credentials.email],
          );

          const user = result.rows[0];

          if (!user) return null;

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password,
          );

          if (!isValid) {
            console.error("Invalid password for user:", credentials.email);
            return null;
          }

          let roleDetails: Record<string, unknown> | null = null;
          if (user.user_type === "patient") {
            const res = await query(
              "SELECT * FROM patients WHERE user_id = $1",
              [user.id],
            );
            roleDetails = toCamelCase(res.rows[0] ?? null) as Record<string, unknown> | null;
          } else if (user.user_type === "doctor") {
            const res = await query(
              "SELECT * FROM doctors WHERE user_id = $1",
              [user.id],
            );
            if (res.rows.length === 0) {
              console.error("Doctor profile not found for user:", user.id);
              return null;
            }
            roleDetails = toCamelCase(res.rows[0]) as Record<string, unknown>;
            
            // Check doctor approval status
            if (roleDetails.approvalStatus !== 'approved') {
              console.warn("Doctor account pending approval:", credentials.email);
              throw new Error("Your account is pending approval by the Super Admin.");
            }
          } else if (user.user_type === "medicalist") {
            const res = await query(
              "SELECT * FROM medicalists WHERE user_id = $1",
              [user.id],
            );
            if (res.rows.length === 0) {
              console.error("Medicalist profile not found for user:", user.id);
              return null;
            }
            roleDetails = toCamelCase(res.rows[0]) as Record<string, unknown>;
          } else if (user.user_type === "superadmin") {
            // superadmin has no dedicated role table — synthesize roleDetails from users row
            roleDetails = {
              id: user.id,
              name: "Super Admin",
              email: user.email,
            };
          }

          return {
            id: user.id.toString(),
            email: user.email,
            userType: user.user_type,
            roleDetails,
          };
        } catch (error: unknown) {
          console.error("Auth error:", error);
          // If it's a known error message, throw it for NextAuth to catch
          const message = error instanceof Error ? error.message : "";
          if (message.includes("approval")) {
            throw error;
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userType = user.userType;
        token.roleDetails = user.roleDetails;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.userType = token.userType;
        session.user.roleDetails = token.roleDetails;
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
};

