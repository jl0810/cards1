import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import EmailProvider from "next-auth/providers/email"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import * as schema from "@/db/schema"
import { eq, and } from "drizzle-orm"

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
                const isDevelopment = process.env.NODE_ENV === "development";

                if (isDevelopment) {
                    console.log("\n--- DEVELOPMENT MAGIC LINK ---");
                    console.log(`To: ${email}`);
                    console.log(`Link: ${url}`);
                    console.log("------------------------------\n");
                }

                const response = await fetch("https://mail.raydoug.com/api/v1/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.USESEND_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM || "noreply@cardsgonecrazy.com",
                        to: email,
                        subject: "Sign in to CardsGoneCrazy",
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2>Sign in to CardsGoneCrazy</h2>
                                <p>Click the button below to sign in:</p>
                                <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #7C3AED; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                                    Sign In
                                </a>
                                <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                                <p style="color: #666; font-size: 12px; word-break: break-all;">${url}</p>
                                <p style="color: #999; font-size: 12px; margin-top: 32px;">This link will expire in 24 hours.</p>
                            </div>
                        `,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to send email: ${response.statusText}`);
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
                    })

                    // 2. If not found, try to find by email in primary family member
                    if (!profile) {
                        const familyMember = await db.query.familyMembers.findFirst({
                            where: (fm, { eq, and }) => and(eq(fm.email, user.email!), eq(fm.isPrimary, true)),
                            with: {
                                user: true
                            }
                        })

                        if (familyMember?.user) {
                            profile = familyMember.user
                            // Update the supabaseId to the new NextAuth ID
                            await db.update(schema.userProfiles)
                                .set({
                                    supabaseId: user.id,
                                    name: user.name || profile.name,
                                    avatar: user.image || profile.avatar,
                                    lastLoginAt: new Date(),
                                    updatedAt: new Date()
                                })
                                .where(eq(schema.userProfiles.id, profile.id))
                        }
                    }

                    // 3. If still not found, create new profile and family member
                    if (!profile) {
                        const [newProfile] = await db.insert(schema.userProfiles).values({
                            supabaseId: user.id,
                            name: user.name || "New User",
                            avatar: user.image || null,
                            lastLoginAt: new Date(),
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }).returning()

                        if (newProfile) {
                            await db.insert(schema.familyMembers).values({
                                userId: newProfile.id,
                                name: user.name || "New User",
                                email: user.email,
                                isPrimary: true,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            })
                        }
                    } else {
                        // Just update last login if profile already linked
                        await db.update(schema.userProfiles)
                            .set({
                                lastLoginAt: new Date(),
                                updatedAt: new Date()
                            })
                            .where(eq(schema.userProfiles.id, profile.id))
                    }
                } catch (error) {
                    console.error("Error syncing user profile:", error)
                    // Don't block sign-in if profile sync fails
                }
            }
            return true
        },
        async session({ session, user }) {
            // Add user ID to session
            if (user) {
                session.user.id = user.id
            }
            return session
        },
    },
    session: {
        strategy: "database",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.AUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
