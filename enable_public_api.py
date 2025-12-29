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

def request(method, url, data=None):
    req = urllib.request.Request(url, method=method, headers=HEADERS)
    if data:
        req.data = json.dumps(data).encode('utf-8')
    
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
    print("--- Enabling Public Access for api.raydoug.com ---")
    
    # 1. Find the App
    apps = request("GET", f"{BASE_URL}?per_page=100")['result']
    api_app = next((a for a in apps if a['domain'] == "api.raydoug.com"), None)
    
    if not api_app:
        print("Error: App 'api.raydoug.com' not found!")
        return

    print(f"Found App: {api_app['name']} ({api_app['id']})")
    
    # 2. Check Existing Policies
    policies = request("GET", f"{BASE_URL}/{api_app['id']}/policies")['result']
    print(f"Current Policies: {[p['name'] for p in policies]}")
    
    # 3. Create 'Public Access' Bypass Policy
    policy_name = "Public Access"
    existing_policy = next((p for p in policies if p['name'] == policy_name), None)
    
    if existing_policy:
        print(f"Policy '{policy_name}' already exists. Updating to ensure it's correct...")
        request("PUT", f"{BASE_URL}/{api_app['id']}/policies/{existing_policy['id']}", {
            "name": policy_name,
            "decision": "bypass",  # Allow public access without login
            "include": [{"everyone": {}}]
        })
    else:
        print(f"Creating '{policy_name}' policy...")
        request("POST", f"{BASE_URL}/{api_app['id']}/policies", {
            "name": policy_name,
            "decision": "bypass",
            "include": [{"everyone": {}}]
        })
        
    print("✅ Success! api.raydoug.com is now public (Bypass Everyone).")

if __name__ == "__main__":
    main()
