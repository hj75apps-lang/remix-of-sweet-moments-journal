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
- Radio search uses mirror failover and verified offline catalog.
- Radio discovery shares a parser: web server function; APK bounded RadioNetwork HTTPS without RPC/CORS; audio/EQ separate.
- Weather data loads directly from Open-Meteo in the browser with a cached last-known forecast; location names use reverse geocoding with coordinate fallback.
- Validate and migrate weather caches through weather-cache before query hydration; legacy daily-only reports receive empty hourly arrays so offline forecasts remain usable after upgrades.
- Restore weather query freshness from the report timestamp and mark incomplete daily caches stale, so older saved forecasts refresh immediately online without losing offline data.
- Theme state is owned by the root ThemeProvider; saved manual choices take priority across routes, while Android system night mode applies only until the user chooses a mode.
- Weather state is shared through useWeather, while the full forecast lives at /clima inside the standard launcher shell so navigation remains available.
- Expanded weather uses a workspace overlay and size container shared with /clima; Dock emits launcher:home to dismiss it on same-route navigation, preserving weather fetching and scroll-free layout.
- Home weather uses an integrated WeatherSymbol outline with card-size-bounded typography and a stacked narrow-card grid; restyles preserve all readings, fetching, state and forecast access.
- Cards reuse global glass surface/border tokens and the existing transparency setting so all widgets match across themes.
- Android steering-wheel media buttons are received through the app's native MediaSession and forwarded to the global radio player so controls work from every route.
- Now-playing validates native sessions and separate bounded ICY reads; events own state, hidden/offline probes pause, source changes clear tracks and images fall back safely.
- Voice Engine guards local actions and cancellation; Android owns speech/TTS/assist intents; root-mounted UI survives page changes; AI requires a verified secure service.
- StatusBar reserves only the shell's matching top inset; the global microphone action lives in Dock so touch targets do not enlarge margins or overlap page content.
- Dock uses fixed top/bottom groups and a scrollable middle with contained, nonshrinking icons to prevent overlap; last-launched reads LauncherApps preferences without UsageStats; other recents use UsageStats and omit duplicates.
- Home grid reserves four navigation columns plus a two-column clock/weather/media rail.
- The Android app is a Capacitor project with package `app.smartautolauncher`; phone calls use its registered CarPhone plugin, default-dialer role, and InCallService so call state and audio routing reach the React phone screen.
- Register native plugins in MainActivity; references never run.
- Launcher-level Android behavior (window mode, boot autostart, navigation intents, system audio, contacts/call log) lives in the LauncherSystem plugin; web prefs are mirrored to native SharedPreferences so the boot receiver works without the WebView.
- Home map taps, expansion and destination submit use startNavigation for normal selected-app launches, not freeform windows; preserve Home state and exclude inputs/credits from map taps.
- Settings context lives outside the Refresh provider to retain identity; validate prefs and apply native settings only after restore.
- Android prerenders offline SPA without nitro; web unchanged.
- Root NavigationProvider shares foreground GPS and retains guidance; validated last GPS and bounded displayed-tile cache preserve offline maps, freezing following until reconnection without region prefetching.
- Home loads Leaflet behind ClientOnly immediately; optional forecast/radio/customization panels load on demand.
- Leaflet tilts ground; navigation-view owns perspective. Single-source OSM tiles need no credentials and provide no live traffic; offline keeps viewed imagery. Android 7. Shared token-styled vehicle SVG preserves offline parity.

- Align clock/night timers to foreground minutes; pause hidden media polling but retain events/controls to avoid idle work.
- Memoize geometry/bearings; manual radio validates saved streams.
- First-opening artwork uses a native no-backup marker: offline, retained on update, reset on reinstall; system startup stays unbranded.
- OTA: RSA/Capgo/cold-start; Releases/Pages. Audit refs. Owner creates/backups keys off-repo; never expose/replace: trust depends on them.

- Wallpaper root provider owns previews/save; local Android AtomicFile or web IndexedDB retains bounded images offline across updates. Capacitor system picker needs no broad permissions.
