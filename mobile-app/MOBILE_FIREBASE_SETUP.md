# Push notifications — what's done, what's left

## Done already

- Firebase project **hv-catalog-service** (742438149734) is wired up.
- Android app registered as `com.hevyf.hvinstantcatalog`; `google-services.json`
  is in `android/app/` and the Gradle plugin is applied — Android push works
  as soon as the server has credentials to send with (next section).
- iOS bundle id set to the same `com.hevyf.hvinstantcatalog` for consistency
  (no Firebase iOS app yet — see below).
- Client code (`lib/services/push_service.dart`) requests permission, grabs
  the FCM token, registers it with the backend
  (`POST /api/mobile/push/register`), and shows a full-screen alarm +
  looping sound on both foreground push and same-poll detection of a new
  order/table request.
- Server code (`src/lib/push/send.ts`) sends via `firebase-admin` from the
  Next.js app whenever a new order or table request comes in — it's a
  silent no-op until the three env vars below are set, so nothing breaks
  in the meantime.

## What you sent that *isn't* needed here

The **Web Push certificate (VAPID key pair)** and its Sender ID are for
Firebase's **JS SDK in a browser** — not used by this native iOS/Android
app. Nothing to do with those; keep them if you ever add a web push
notification to the Next.js dashboard itself, otherwise ignore.

## What's actually still needed

### 1. Server credentials, so the backend can *send* pushes
Firebase console → **Project settings → Service accounts → Generate new
private key**. That downloads a JSON file — different from
`google-services.json` — with `project_id`, `client_email`, and
`private_key`. Paste those three into `.env.local`:

```
FIREBASE_PROJECT_ID=hv-catalog-service
FIREBASE_CLIENT_EMAIL=...@hv-catalog-service.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

(Keep the `\n` sequences literal — don't reformat into real newlines.)
Once these are set, Android push works immediately, no rebuild needed.

### 2. iOS: add the Firebase iOS app + APNs key
1. Firebase console → Add app → iOS → bundle ID `com.hevyf.hvinstantcatalog`.
2. Download the `GoogleService-Info.plist` it gives you and drop it at
   `ios/Runner/GoogleService-Info.plist` — tell me once it's there and I'll
   wire the last step (adding it to the Xcode project's Runner target,
   which needs to be done through Xcode itself, not a text edit).
3. APNs key: Apple Developer account → Certificates, Identifiers & Profiles
   → Keys → create an **APNs key**, then upload it in Firebase console →
   Project settings → Cloud Messaging → Apple app configuration. This step
   needs your Apple Developer account (same one you'll use for code
   signing) — nothing to do until you're ready for that.

### 3. Test it
Once (1) is done, place any real order or send a table request from a live
storefront — the merchant's phone should get a push and a looping alarm
within a couple of seconds.
