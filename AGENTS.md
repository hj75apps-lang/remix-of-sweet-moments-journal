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
- Radio website discovery shares one parser: web uses the existing server function; APK uses the registered RadioNetwork plugin for bounded public HTTPS page/probe reads and playlists, because the static package has no server RPC and stream hosts may omit CORS. Audio and EQ remain on separate WebView audio elements.
- Weather data loads directly from Open-Meteo in the browser with a cached last-known forecast; location names use reverse geocoding with coordinate fallback.
- Validate and migrate weather caches through weather-cache before query hydration; legacy daily-only reports receive empty hourly arrays so offline forecasts remain usable after upgrades.
- Restore weather query freshness from the report timestamp and mark incomplete daily caches stale, so older saved forecasts refresh immediately online without losing offline data.
- Theme state is owned by the root ThemeProvider; saved manual choices take priority across routes, while Android system night mode applies only until the user chooses a mode.
- Weather state is shared through useWeather, while the full forecast lives at /clima inside the standard launcher shell so navigation remains available.
- Expanded weather uses a dedicated workspace overlay and a bounded forecast size container shared with /clima; daily layout adapts by available width and height without scroll or changes to weather fetching.
- The home weather presentation uses WeatherSymbol for condition-coloured artwork and links to the existing full forecast; keep weather fetching and state unchanged during visual restyles.
- Android steering-wheel media buttons are received through the app's native MediaSession and forwarded to the global radio player so controls work from every route.
- Now-playing selection uses external Android MediaSessions plus the in-app radio store; all external sessions are observed and permission is refreshed on resume so source changes and late grants are detected.
- Android voice activation and the global microphone control use the native speech recognizer; parsed commands reach routing and radio controls from every route.
- StatusBar reserves only the shell's matching top inset; the global microphone action lives in Dock so touch targets do not enlarge margins or overlap page content.
- The launcher dock keeps Home, Online Radio, Apps, and Settings fixed; the former Phone slot reads the last successfully launched app from LauncherApps native preferences without UsageStats permission, while remaining recent slots use UsageStats and omit duplicates.
- The default 1280×720 launcher grid reserves four columns for navigation and stacks clock, weather, and media in the two-column side rail.
- The Android app is a Capacitor project with package `app.smartautolauncher`; phone calls use its registered CarPhone plugin, default-dialer role, and InCallService so call state and audio routing reach the React phone screen.
- Native Android capabilities live in compiled Capacitor plugins under the app package and are registered in MainActivity; reference-only plugin files are never runtime implementations.
- Launcher-level Android behavior (window mode, boot autostart, navigation intents, system audio, contacts/call log) lives in the LauncherSystem plugin; web prefs are mirrored to native SharedPreferences so the boot receiver works without the WebView.
- Launcher preferences live in a single versioned, validated settings provider (use-launcher-settings) mounted in the root route.
- The Android build (build:android) prerenders a static SPA shell with nitro disabled so Capacitor can package the app offline; the web/Cloudflare build is unchanged.
- The root NavigationProvider owns the last GPS fix and real notification guidance; visible map adapters acquire one foreground LocationService subscription, because navigation must survive route changes without duplicate GPS watches.
- Navigation uses the existing lazy Leaflet/OSM adapter and native LauncherSystem app detection/intents; real notification fields are shown verbatim, never invented polylines or ETA, because external navigators do not expose their route geometry to this launcher.
