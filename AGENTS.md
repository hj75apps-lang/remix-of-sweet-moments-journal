<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Radio playback uses a plain <audio> by default and a separate CORS-enabled element for Web Audio EQ, so stations without CORS never go silent.
- Radio directory requests go through mirror failover (radio-browser.ts) with the verified catalog as offline fallback, so search survives server outages.
- Radio search by website runs server-side (stream-discovery.functions.ts): fetch the page and its player pages, keep only links that answer with audio, since browsers can't read other sites and many stations aren't in Radio Browser.
- Weather data loads directly from Open-Meteo in the browser with a cached last-known forecast; location names use reverse geocoding with coordinate fallback.
- Theme state is owned by the root ThemeProvider; saved manual choices take priority across routes, while Android system night mode applies only until the user chooses a mode.
- Weather state is shared through useWeather, while the full forecast lives at /clima inside the standard launcher shell so navigation remains available.
- Android steering-wheel media buttons are received through the app's native MediaSession and forwarded to the global radio player so controls work from every route.
- Android voice activation and the global microphone control use the native speech recognizer; parsed commands reach routing and radio controls from every route.
- The launcher dock keeps Home, Online Radio, Phone, Apps, and Settings fixed; remaining slots show up to four recent Android apps with their native icons via UsageStats.
- The default 1280×720 launcher grid reserves four columns for navigation and stacks clock, weather, and media in the two-column side rail.
- The Android app is a Capacitor project with package `app.smartautolauncher`; phone calls use its registered CarPhone plugin, default-dialer role, and InCallService so call state and audio routing reach the React phone screen.
- Native Android capabilities live in compiled Capacitor plugins under the app package and are registered in MainActivity; reference-only plugin files are never runtime implementations.
- Launcher-level Android behavior (window mode, boot autostart, navigation intents, system audio, contacts/call log) lives in the LauncherSystem plugin; web prefs are mirrored to native SharedPreferences so the boot receiver works without the WebView.
- Launcher preferences live in a single versioned, validated settings provider (use-launcher-settings) mounted in the root route.
- The Android build (build:android) prerenders a static SPA shell with nitro disabled so Capacitor can package the app offline; the web/Cloudflare build is unchanged.
- The home navigation card follows the CarPlay/Android Auto pattern: own live map (Leaflet + OSM, lazy client-only) plus turn-by-turn guidance read from the nav app's ongoing notification; external apps cannot be embedded, so tapping opens the chosen app full screen.
