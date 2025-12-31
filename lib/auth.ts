/* eslint-disable */
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import EmailProvider from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    AppleProvider({
      clientId: process.env.AUTH_APPLE_ID!,
      clientSecret: process.env.AUTH_APPLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: "smtp://localhost:25", // Dummy value - we use custom sendVerificationRequest
      from: process.env.EMAIL_FROM || "noreply@cardsgonecrazy.com",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        // Import email templates
        const { renderMagicLinkEmail, getBranding, sendEmail } = await import(
          "@raydoug/email-templates"
        );

        const branding = getBranding("cards");
        const isDevelopment = process.env.NODE_ENV === "development";

        if (isDevelopment) {
          /* eslint-disable no-console */
          console.log("\n--- DEVELOPMENT MAGIC LINK ---");
          console.log(`To: ${email}`);
          console.log(`Link: ${url}`);
          console.log("------------------------------\n");
          /* eslint-enable no-console */
        }

        try {
          // Render the email template
          const html = await renderMagicLinkEmail({
            magicLink: url,
            branding,
            userEmail: email,
          });

          // Send via useSend
          const result = await sendEmail({
            to: email,
            from: process.env.EMAIL_FROM || "noreply@cardsgonecrazy.com",
            subject: `Sign in to ${branding.appName}`,
            html,
            apiKey: process.env.USESEND_API_KEY!,
          });

          // eslint-disable-next-line no-console
          console.log("✅ useSend API Success:", result);
        } catch (error) {
          console.error("❌ sendVerificationRequest Error:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      // Sync user to user_profiles table
      if (user.email && user.id) {
        try {
          // 1. Try to find by supabaseId (NextAuth ID)
          let profile = await db.query.userProfiles.findFirst({
            where: (profiles, { eq }) => eq(profiles.supabaseId, user.id!),
          });

          // 2. If not found, try to find by email in primary family member
          if (!profile) {
            const familyMember = await db.query.familyMembers.findFirst({
              where: (fm, { eq, and }) =>
                and(eq(fm.email, user.email!), eq(fm.isPrimary, true)),
              with: {
                user: true,
              },
            });

            if (familyMember?.user) {
              profile = familyMember.user;
              // Update the supabaseId to the new NextAuth ID
              await db
                .update(schema.userProfiles)
                .set({
                  supabaseId: user.id,
                  name: user.name || profile.name,
                  avatar: user.image || profile.avatar,
                  lastLoginAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(schema.userProfiles.id, profile.id));
            }
          }

          // 3. If still not found, create new profile and family member
          if (!profile) {
            const [newProfile] = await db
              .insert(schema.userProfiles)
              .values({
                supabaseId: user.id,
                name: user.name || "New User",
                avatar: user.image || null,
                lastLoginAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();

            if (newProfile) {
              await db.insert(schema.familyMembers).values({
                userId: newProfile.id,
                name: user.name || "New User",
                email: user.email,
                isPrimary: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              // Send welcome email
              try {
                const { sendWelcomeEmail, getBranding } = await import(
                  "@raydoug/email-templates"
                );
                await sendWelcomeEmail({
                  to: user.email!,
                  userName: user.name || undefined,
                  branding: getBranding("cards"),
                  apiKey: process.env.USESEND_API_KEY!,
                });
              } catch (e) {
                console.error("Failed to send welcome email:", e);
              }
            }
          } else {
            // Just update last login if profile already linked
            await db
              .update(schema.userProfiles)
              .set({
                lastLoginAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(schema.userProfiles.id, profile.id));
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
          // Don't block sign-in if profile sync fails
        }
      }
      return true;
    },
    async session({ session, user }) {
      // Add user ID to session
      if (user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
