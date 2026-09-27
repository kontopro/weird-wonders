import { Play } from "lucide-react";
import { useState } from "react";
import type { ArticleBlock } from "@/lib/article-content";
import { videoPlayerUrl } from "@/lib/video-embed";

type EmbedData = Extract<ArticleBlock, { type: "embed" }>["data"];

/**
 * YouTube/Vimeo videos load only after a click, so no third-party request
 * (or cookie) happens before the reader chooses to play. Other embeds are links.
 */
export function EmbedBlock({ data }: { data: EmbedData }) {
  const [playing, setPlaying] = useState(false);
  const player = videoPlayerUrl(data.provider, data.url);
  const title = data.title ?? "Βίντεο";

  if (!player) {
    return (
      <aside className="content-embed">
        <span>{data.provider}</span>
        <a href={data.url} rel="noopener noreferrer">
          {data.title ?? "Άνοιγμα εξωτερικού περιεχομένου"}
        </a>
      </aside>
    );
  }

  return (
    <figure className="content-video">
      {playing ? (
        <iframe
          src={`${player}${player.includes("?") ? "&" : "?"}autoplay=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="content-video-poster" onClick={() => setPlaying(true)}>
          <Play aria-hidden="true" />
          <strong>{title}</strong>
          <small>
            Πάτα για αναπαραγωγή · φορτώνεται από{" "}
            {data.provider === "youtube" ? "YouTube" : "Vimeo"}
          </small>
        </button>
      )}
    </figure>
  );
}
