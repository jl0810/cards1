import postgres from 'postgres'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sql = postgres(process.env.DATABASE_URL!)

async function test() {
    try {
        const result = await sql`SELECT 1 as connected`
        console.log('✅ Connection successful:', result)
        process.exit(0)
    } catch (err) {
        console.error('❌ Connection failed:', err)
        process.exit(1)
    }
}

test()
