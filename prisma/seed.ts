import { PrismaClient } from '../generated/prisma/client'

const prisma = new PrismaClient({})

async function main() {
  console.log('🌱 Seeding user profiles...')

  // Create a demo user profile
  const demoProfile = await prisma.userProfile.upsert({
    where: { clerkId: 'demo-user-clerk-id' },
    update: {},
    create: {
      clerkId: 'demo-user-clerk-id',
      name: 'Demo User',
      bio: 'Passionate developer exploring modern SaaS architectures',
      website: 'https://demo.example.com',
      location: 'San Francisco, CA',

      // Settings
      theme: 'dark',
      language: 'en',
      timezone: 'America/Los_Angeles',
      emailNotifications: true,
      pushNotifications: false,

      // Metadata
      onboardingCompleted: true,
      lastLoginAt: new Date(),
    },
  })

  console.log('✅ User profile seeded successfully!')
  console.log(`👤 Demo profile: ${demoProfile.name}`)
  console.log(`🎨 Theme: ${demoProfile.theme}`)
  console.log(`🌍 Location: ${demoProfile.location}`)
  console.log(`📧 Email notifications: ${demoProfile.emailNotifications}`)
  console.log(`🔔 Push notifications: ${demoProfile.pushNotifications}`)
  console.log(`✅ Onboarding completed: ${demoProfile.onboardingCompleted}`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
