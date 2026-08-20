# Android / Google Play

This is the existing quote website wrapped for Android (Capacitor). It is not a Kotlin rewrite. Desktop `npm run dev` still works as before.

**Package ID:** `au.com.competitivepestservices.quote`  
**App name:** Competitive Pest Services

Quotes and rates stay in this app on the phone (the same local browser storage). They are **not** shared with the PC, and they are **not** in the Play Store listing until you upload a build.

## Test on a phone (USB, no store)

1. Install [Android Studio](https://developer.android.com/studio).
2. On the Android phone: Settings → About phone → tap **Build number** seven times, then turn on **USB debugging**.
3. Plug the phone in. Allow debugging if asked.
4. On the PC, in this folder:

```
npm run build:android
npx cap open android
```

5. In Android Studio, pick your phone and press **Run**.  
   That installs a debug APK for testing. You can also use **Build → Build Bundle(s) / APK(s) → Build APK(s)** and copy the APK onto the phone.

## Google Play (later)

1. Create a [Google Play Console](https://play.google.com/console) account (about **US$25**, one-time).
2. Keep using Android Studio on this Windows PC. You do not need a Mac.
3. Create an upload **signing key** (keystore) and store it somewhere safe, with backups. If you lose it, you cannot update the app.
4. For the store, build an **Android App Bundle (.aab)**, not only an APK: **Build → Generate Signed App Bundle / APK**.
5. In Play Console, create the app, fill in the listing (name, screenshots, content rating), and upload the `.aab`.

After you change the quote screens on the PC, run `npm run build:android` again, then rebuild in Android Studio.
