/** Turns a YouTube or Vimeo page URL into a privacy-friendly player URL, or null. */
export function videoPlayerUrl(provider: string, url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (provider === "youtube") {
    let id: string | null = null;
    if (host === "youtu.be") id = parsed.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id =
        parsed.searchParams.get("v") ??
        /^\/(?:embed|shorts|live)\/([^/?]+)/.exec(parsed.pathname)?.[1] ??
        null;
    }
    // youtube-nocookie.com does not set tracking cookies until playback.
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  if (provider === "vimeo") {
    const id =
      host === "vimeo.com" || host === "player.vimeo.com"
        ? /\/(\d{5,12})(?:$|[/?#])/.exec(parsed.pathname + "/")?.[1]
        : undefined;
    return id ? `https://player.vimeo.com/video/${id}?dnt=1` : null;
  }
  return null;
}
