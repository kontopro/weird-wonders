import { describe, expect, test } from "bun:test";
import { videoPlayerUrl } from "@/lib/video-embed";

describe("videoPlayerUrl", () => {
  test("accepts common YouTube and Vimeo URLs", () => {
    const yt = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    expect(videoPlayerUrl("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(yt);
    expect(videoPlayerUrl("youtube", "https://youtu.be/dQw4w9WgXcQ")).toBe(yt);
    expect(videoPlayerUrl("youtube", "https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(yt);
    expect(videoPlayerUrl("vimeo", "https://vimeo.com/76979871")).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1",
    );
  });

  test("rejects other hosts and malformed ids", () => {
    expect(videoPlayerUrl("youtube", "https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(videoPlayerUrl("youtube", "https://youtube.com/watch?v=<script>")).toBeNull();
    expect(videoPlayerUrl("vimeo", "https://vimeo.com/about")).toBeNull();
    expect(videoPlayerUrl("generic", "https://example.com")).toBeNull();
  });
});
