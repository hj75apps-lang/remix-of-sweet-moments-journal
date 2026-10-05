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
- Weather data comes from Open-Meteo through the existing server function; location names use reverse geocoding with coordinate fallback.
