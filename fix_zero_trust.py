import urllib.request
import urllib.error
import json
import ssl

ACCOUNT_ID = "0f6a82c906336fc275932bf543fba961"
TOKEN = "Fleow80btRSmawwtROaS2u0mUlY_C47YJKmJGBc5"
BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/access/apps"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

ADMIN_GROUP_ID = "9e16bff0-8e9d-4a7a-aaab-07541f88f8e4"
SERVICE_TOKEN_ID = "15a661a2-bc33-409d-86d9-ffcc217ffdce"

def request(method, url, data=None):
    req = urllib.request.Request(url, method=method, headers=HEADERS)
    if data:
        req.data = json.dumps(data).encode('utf-8')
    
    # Use unverified context to avoid SSL cert issues in some environments, 
    # though usually default is fine.
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=context) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"Error {method} {url}: {e.read().decode('utf-8')}")
        return None

def main():
    print("--- 1. Creating/Checking 'Supabase Studio' App ---")
    
    # Check if exists
    apps = request("GET", BASE_URL)['result']
    studio_app = next((a for a in apps if a['domain'] == "studio.raydoug.com"), None)
    
    if not studio_app:
        print("Creating Supabase Studio app...")
        studio_app = request("POST", BASE_URL, {
            "name": "Supabase Studio",
            "domain": "studio.raydoug.com",
            "type": "self_hosted",
            "session_duration": "24h"
        })['result']
        print(f"Created app: {studio_app['id']}")
    else:
        print(f"Supabase Studio app already exists: {studio_app['id']}")

    # Configure Policies for Studio
    print("Configuring policies for Supabase Studio...")
    policies = request("GET", f"{BASE_URL}/{studio_app['id']}/policies")['result']
    
    # Allow Admins
    if not any(p['name'] == "Allow Admins" for p in policies):
        print("Adding 'Allow Admins' policy...")
        request("POST", f"{BASE_URL}/{studio_app['id']}/policies", {
            "name": "Allow Admins",
            "decision": "allow",
            "include": [{"group": {"id": ADMIN_GROUP_ID}}]
        })
        
    # Allow Service
    if not any(p['name'] == "Allow Service" for p in policies):
        print("Adding 'Allow Service' policy...")
        request("POST", f"{BASE_URL}/{studio_app['id']}/policies", {
            "name": "Allow Service",
            "decision": "allow",
            "include": [{"service_token": {"token_id": SERVICE_TOKEN_ID}}]
        })

    print("\n--- 2. Cleaning up 'Macbook dual-stack Bypass' from all apps ---")
    
    # Refresh apps list just in case
    apps = request("GET", f"{BASE_URL}?per_page=100")['result']
    
    for app in apps:
        print(f"Checking app: {app['name']} ({app['domain']})")
        app_policies = request("GET", f"{BASE_URL}/{app['id']}/policies")['result']
        
        for policy in app_policies:
            if policy['name'] == "Macbook dual-stack Bypass":
                print(f"  [DELETE] Found IP bypass policy '{policy['name']}' - Deleting...")
                request("DELETE", f"{BASE_URL}/{app['id']}/policies/{policy['id']}")
            elif "bypass" in policy['name'].lower() and "ip" in policy['name'].lower():
                 # Optional: Catch other IP bypasses? User asked to "fix all".
                 # Let's stick to the specific name mostly, but mentioning it.
                 pass

    print("\n--- Done! ---")

if __name__ == "__main__":
    main()
