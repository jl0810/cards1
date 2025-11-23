# Capacitor iOS Setup Guide

This guide walks you through setting up and deploying the PointMax Velocity app to the iOS App Store using Capacitor.

## ✅ Status

- ✅ Capacitor installed and configured
- ✅ iOS platform added
- ✅ Platform detection utilities created
- ✅ Config file set up
- ⏸️ Needs: Production build & Xcode setup

---

## 📋 Prerequisites

### Required

- **macOS** with Xcode 14+ installed
- **Apple Developer Account** ($99/year)
- **CocoaPods** installed:
  ```bash
  sudo gem install cocoapods
  ```

### Verify Installation

```bash
xcode-select --install  # If needed
pod --version           # Should show version
```

---

## 🏗️ Architecture: Hybrid Approach

We're using the **hybrid architecture** which means:

```
┌─────────────────────────────┐
│  iOS App (Capacitor)        │
│  ┌───────────────────────┐  │
│  │ WebView               │  │
│  │ (Your Next.js UI)     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Native Features       │  │
│  │ - Face ID             │  │
│  │ - Push Notifications  │  │
│  │ - Haptic Feedback     │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
           ▲
           │ HTTPS
           ▼
┌─────────────────────────────┐
│  Vercel (Backend)           │
│  - Next.js API Routes       │
│  - Prisma + PostgreSQL      │
│  - Plaid Integration        │
└─────────────────────────────┘
```

**Benefits:**
- ✅ Keep all API routes server-side (no changes needed)
- ✅ Single codebase for web + mobile
- ✅ Easy updates (just deploy to Vercel)
- ✅ Native iOS features when needed

---

## 🚀 Step-by-Step Setup

### Step 1: Update Capacitor Config

The config is already set up in `capacitor.config.ts`. For **development**, update it to point to your local server:

```typescript
// capacitor.config.ts
server: {
  url: 'http://localhost:3000',  // ← Uncomment for dev
  cleartext: true,
},
```

For **production** (App Store build), comment it out (already done):

```typescript
server: {
  // url: 'http://localhost:3000',  // ← Commented for production
  androidScheme: 'https',
  iosScheme: 'capacitor',
},
```

### Step 2: Build Next.js for Production

Currently, the iOS app will connect to your **deployed Vercel backend**. Make sure it's deployed:

```bash
# Deploy to Vercel
vercel --prod

# Note the production URL - you'll need it!
```

### Step 3: Open Xcode

```bash
npx cap open ios
```

This opens Xcode with your iOS project.

### Step 4: Configure in Xcode

#### 4.1 Set Bundle Identifier
1. In Xcode, select the project in the left sidebar
2. Select the "App" target
3. Go to "Signing & Capabilities"
4. Set **Bundle Identifier**: `com.pointmax.velocity`
5. Select your **Team** (Apple Developer account)

#### 4.2 Set Display Name
1. In "General" tab
2. Set **Display Name**: `PointMax Velocity`

#### 4.3 Add Capabilities

Click "+ Capability" and add:
- ✅ **Push Notifications**
- ✅ **Background Modes** → Check "Remote notifications"
- ✅ **Sign in with Apple** (if using Clerk social auth)

#### 4.4 Add Privacy Descriptions

Open `ios/App/App/Info.plist` and add:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to securely access your financial data</string>
<key>NSCameraUsageDescription</key>
<string>Scan credit cards to add them quickly</string>
```

### Step 5: Update App Icons & Splash Screen

#### App Icon
1. Create 1024x1024px app icon
2. Go to `ios/App/App/Assets.xcassets/AppIcon.appiconset`
3. Replace placeholder images or use Xcode's asset catalog

#### Splash Screen
Already configured in `capacitor.config.ts` with your brand color (`#02040a`).

### Step 6: Build & Run

#### Run in Simulator (Testing)
1. Select a simulator (e.g., iPhone 15 Pro)
2. Click ▶️ Run button
3. App should launch and connect to your Vercel backend

#### Build for Device
1. Connect iPhone via USB
2. Select your device in Xcode
3. Click ▶️ Run
4. Trust developer certificate on device (Settings → General → VPN & Device Management)

---

## 📦 App Store Submission

### Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to "My Apps"
3. Click "+" → "New App"
4. Fill in:
   - **Platform**: iOS
   - **Name**: PointMax Velocity
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.pointmax.velocity
   - **SKU**: pointmax-velocity-ios

### Step 2: Prepare App Metadata

**Required Screenshots:** (Use simulator or device)
- 6.7" Display (iPhone 15 Pro Max): 1290x2796px
- 6.5" Display (iPhone 14 Plus): 1242x2688px  
- 5.5" Display (iPhone 8 Plus): 1242x2208px

**App Description:**
```
PointMax Velocity helps you maximize credit card rewards by automatically matching your spending to the best card benefits.

Features:
• Connect credit cards via secure Plaid integration
• Automatic transaction sync and categorization
• AI-powered benefit matching
• Family member support
• Real-time spending insights
• Secure biometric authentication

Never miss out on credit card rewards again!
```

**Keywords:**
```
credit cards, rewards, points, cash back, finance, budgeting, plaid
```

**Privacy Policy URL:** (Required for finance apps)
Create and host a privacy policy, then add URL.

**Support URL:**
Your website or support page.

### Step 3: Build Archive

In Xcode:
1. Select "Any iOS Device (arm64)"
2. Product → Archive
3. Wait for build (5-10 min)
4. Click "Distribute App"
5. Choose "App Store Connect"
6. Upload

### Step 4: Submit for Review

1. In App Store Connect, go to your app
2. Select version
3. Fill in:
   - What's New
   - Screenshots
   - Description
   - Keywords
   - Support/Privacy URLs
4. Add build (the one you just uploaded)
5. Answer export compliance questions
6. Click "Submit for Review"

**Review Time:** Typically 24-48 hours

---

## 🔄 Development Workflow

### Daily Development

```bash
# 1. Start Next.js dev server
npm run dev

# 2. Update capacitor.config.ts to use localhost
# (See Step 1 above)

# 3. Open in Xcode
npx cap openos

# 4. Run in simulator
# Changes to Next.js will hot-reload in simulator!
```

### Updating the App

**For UI/API changes (no native code changes):**
```bash
# Just deploy to Vercel
vercel --prod

# Users get update next time they open app
# No App Store review needed! 🎉
```

**For native feature changes:**
```bash
# 1. Make changes
# 2. Open Xcode
npx cap open ios

# 3. Archive and submit
# Requires App Store review
```

---

## 🎯 Adding Native Features

### Example: Face ID Authentication

```typescript
// lib/biometric.ts
import { Capacitor } from '@capacitor/core';

export async function authenticateWithBiometric() {
  if (!Capacitor.isNativePlatform()) {
    return false; // Skip on web
  }

  const { BiometricAuth } = await import('@capacitor-community/biometric-auth');
  
  const available = await BiometricAuth.checkBiometry();
  if (!available.isAvailable) {
    return false;
  }

  const result = await BiometricAuth.verify({
    reason: 'Authenticate to access your cards',
  });
  
  return result.verified;
}

// Usage in component
import { isNative } from '@/lib/platform';
import { authenticateWithBiometric } from '@/lib/biometric';

function LoginPage() {
  const handleBiometricLogin = async () => {
    const verified = await authenticateWithBiometric();
    if (verified) {
      // Log in user
    }
  };

  return (
    <div>
      <SignInForm />
      
      {isNative && (
        <button onClick={handleBiometricLogin}>
          Sign in with Face ID
        </button>
      )}
    </div>
  );
}
```

### Example: Haptic Feedback

```typescript
// Already installed: @capacitor/haptics
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from '@/lib/platform';

async function deleteItem() {
  // Haptic feedback on tap
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Medium });
  }
  
  // Perform delete
  await fetch('/api/delete', { method: 'DELETE' });
}
```

---

## 🐛 Troubleshooting

### "Command PhaseScriptExecution failed"
```bash
cd ios/App
pod install
```

### "Unable to boot simulator"
```bash
# Reset simulator
xcrun simctl erase all
```

### "App doesn't connect to backend"
Check `capacitor.config.ts` - make sure `server.url` is correct or commented out for production.

### "Face ID not working"
1. Check `Info.plist` has `NSFaceIDUsageDescription`
2. Verify capability is added in Xcode

---

## 📊 Performance Tips

### Optimize for Mobile

1. **Use platform detection** to show/hide features
2. **Implement offline caching** (already set up with hooks)
3. **Add loading states** for API calls
4. **Use haptic feedback** for better UX
5. **Optimize images** for mobile screens

### Example: Conditional Features

```typescript
import { platform } from '@/lib/platform';

function Dashboard() {
  return (
    <div>
      {/* Always show */}
      <WalletView />
      
      {/* iOS-only */}
      {platform.isIOS && <FaceIDPrompt />}
      
      {/* Web-only */}
      {platform.isWeb && <DesktopSidebar />}
    </div>
  );
}
```

---

## 📱 Testing Checklist

Before submitting to App Store:

- [ ] App launches successfully
- [ ] Can log in with Clerk
- [ ] Plaid link works (connect bank account)
- [ ] Transactions sync properly
- [ ] All screens render correctly
- [ ] Navigation works
- [ ] No console errors
- [ ] Face ID works (if implemented)
- [ ] Push notifications work (if implemented)
- [ ] App doesn't crash on low memory
- [ ] Works on iPhone SE (small screen)
- [ ] Works on iPhone 15 Pro Max (large screen)
- [ ] Looks good in light and dark mode

---

## 🎓 Next Steps

1. **Build and test** in simulator
2. **Deploy backend** to Vercel  
3. **Test on real device**
4. **Create App Store assets** (icon, screenshots, description)
5. **Submit for review**

---

## 📚 Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- Platform Detection: `/lib/platform.ts`

---

**Last Updated:** November 23, 2025  
**Status:** ✅ Ready for Development  
**Next:** Build in Xcode and test in simulator!
