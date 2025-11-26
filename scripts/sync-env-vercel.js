
const { execSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

const vars = {};

lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    let value = valueParts.join('=');

    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
    }

    if (key && value) {
        vars[key] = value;
    }
});

console.log(`Found ${Object.keys(vars).length} variables to sync...`);

for (const [key, value] of Object.entries(vars)) {
    if (key === 'NEXT_PUBLIC_APP_URL') continue; // Skip this one

    try {
        console.log(`Adding ${key}...`);
        // Pipe the value to stdin to avoid shell escaping issues
        execSync(`printf "${value}" | npx vercel env add ${key} production`, { stdio: 'inherit' });
    } catch (e) {
        console.error(`Failed to add ${key}`);
    }
}
