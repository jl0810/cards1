
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Configuration
const COOLIFY_API_URL = 'https://coolify.raydoug.com/api/v1';
const APP_UUID = 'a840k0wg0w8g88swcs480w8w'; // Cards UUID
const ENV_FILE = path.join(process.cwd(), '.env.local');

// Get Token
const TOKEN = process.env.COOLIFY_API_TOKEN;
if (!TOKEN) {
    console.error('❌ Error: COOLIFY_API_TOKEN environment variable is required.');
    process.exit(1);
}

async function pushEnvVars() {
    console.log(`🚀 Pushing environment variables from .env.local to Coolify (${APP_UUID})...`);

    if (!fs.existsSync(ENV_FILE)) {
        console.error('❌ Error: .env.local file not found.');
        process.exit(1);
    }

    const envConfig = dotenv.parse(fs.readFileSync(ENV_FILE));
    const keys = Object.keys(envConfig);

    console.log(`Found ${keys.length} variables to push.`);

    // Fetch current list once to optimize
    const listResponse = await fetch(`${COOLIFY_API_URL}/applications/${APP_UUID}/envs`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (!listResponse.ok) {
        console.error("Failed to connect to Coolify API");
        process.exit(1);
    }

    const currentEnvs = await listResponse.json();

    for (const key of keys) {
        const value = envConfig[key];
        const existing = currentEnvs.find((e: any) => e.key === key);

        // Skip if value hasn't changed to save API calls
        if (existing && existing.value === value) {
            console.log(`   ⏭️  Skipping ${key} (unchanged)`);
            continue;
        }

        console.log(`   ${existing ? 'Updating' : 'Creating'} ${key}...`);

        try {
            if (existing) {
                await fetch(`${COOLIFY_API_URL}/applications/${APP_UUID}/envs`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uuid: existing.uuid,
                        value: value
                    })
                });
            } else {
                await fetch(`${COOLIFY_API_URL}/applications/${APP_UUID}/envs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        key: key,
                        value: value,
                        is_build_time: false,
                        is_preview: false,
                        is_secret: false
                    })
                });
            }

        } catch (error) {
            console.error(`   ❌ Failed to push ${key}`, error);
        }
    }

    console.log('✅ Push complete. Redeploy required.');
}

pushEnvVars();
