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

- Radio uses plain audio plus separate CORS-enabled EQ audio; actual audio events own playback state, so controls stay accurate without silencing non-CORS stations.
- Radio listening history is a validated local preference owned by the global player; rank filtered station lists by confirmed listening time over the last thirty days, using normalized names across catalog id changes and leaving next/previous queues stable.
- Radio directory uses mirror failover and a verified offline catalog so search survives outages.
- Radio website discovery shares a parser: web uses its server function; APK uses RadioNetwork for bounded public HTTPS reads/playlists without server RPC or CORS. Keep audio and EQ separate.
- Weather data loads directly from Open-Meteo in the browser with a cached last-known forecast; location names use reverse geocoding with coordinate fallback.
- Validate and migrate weather caches through weather-cache before query hydration; legacy daily-only reports receive empty hourly arrays so offline forecasts remain usable after upgrades.
- Restore weather query freshness from the report timestamp and mark incomplete daily caches stale, so older saved forecasts refresh immediately online without losing offline data.
- Theme state is owned by the root ThemeProvider; saved manual choices take priority across routes, while Android system night mode applies only until the user chooses a mode.
- Weather state is shared through useWeather, while the full forecast lives at /clima inside the standard launcher shell so navigation remains available.
- Expanded weather uses a workspace overlay and size container shared with /clima; Dock emits launcher:home to dismiss it on same-route navigation, preserving weather fetching and scroll-free layout.
- Home weather uses an integrated WeatherSymbol outline with card-size-bounded typography and a stacked narrow-card grid; restyles preserve all readings, fetching, state and forecast access.
- Cards reuse global glass surface/border tokens and the existing transparency setting so all widgets match across themes.
- Android steering-wheel media buttons are received through the app's native MediaSession and forwarded to the global radio player so controls work from every route.
- Now-playing selection uses external Android MediaSessions plus the in-app radio store; all external sessions are observed and permission is refreshed on resume so source changes and late grants are detected.
- Android voice activation and the global microphone control use the native speech recognizer; parsed commands reach routing and radio controls from every route.
- StatusBar reserves only the shell's matching top inset; the global microphone action lives in Dock so touch targets do not enlarge margins or overlap page content.
- The launcher dock keeps Home, Online Radio, Apps, and Settings fixed; the former Phone slot reads the last successfully launched app from LauncherApps native preferences without UsageStats permission, while remaining recent slots use UsageStats and omit duplicates.
- Home grid reserves four navigation columns plus a two-column clock/weather/media rail.
- The Android app is a Capacitor project with package `app.smartautolauncher`; phone calls use its registered CarPhone plugin, default-dialer role, and InCallService so call state and audio routing reach the React phone screen.
- Native Capacitor plugins register in MainActivity; reference files never run.
- Launcher-level Android behavior (window mode, boot autostart, navigation intents, system audio, contacts/call log) lives in the LauncherSystem plugin; web prefs are mirrored to native SharedPreferences so the boot receiver works without the WebView.
- Home map taps, expansion and destination submit use startNavigation for normal selected-app launches, not freeform windows; preserve Home state and exclude inputs/credits from map taps.
- Root settings provider validates versioned prefs; apply native settings only after restore to prevent startup overwrites.
- Android prerenders an offline SPA with nitro disabled; web build is unchanged.
- Root NavigationProvider shares foreground GPS and retains guidance; validated last GPS and bounded displayed-tile cache preserve offline maps, freezing following until reconnection without region prefetching.
- Home loads Leaflet behind ClientOnly immediately; optional forecast/radio/customization panels load on demand.
- Leaflet tilts ground only; navigation-view owns perspective. Mapbox traffic raster refreshes foreground-only, offline imagery stays last-known; OSM never implies traffic. Preserve Android 7.

- Align clock/night timers to foreground minutes; pause hidden media polling but retain events/controls to avoid idle work.
- Memoize snapshots/route geometry and unchanged bearings; shared manual-radio validation matches saved-stream rules.
- First-opening artwork uses a native MainActivity overlay and no-backup file marker: offline, retained on update, reset on reinstall. Keep system startup unbranded to prevent repeats; web navigation stays untouched.
