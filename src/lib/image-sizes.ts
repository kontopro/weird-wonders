/**
 * `sizes` hints for responsive images: roughly how wide each kind of image is
 * drawn, so the browser picks the smallest copy from `srcset` that looks sharp.
 * Keep in step with the layout in `src/styles.css`.
 */
export const imageSizes = {
  hero: "(min-width: 1024px) 66vw, 100vw",
  cover: "(min-width: 1280px) 1200px, 100vw",
  content: "(min-width: 820px) 720px, 100vw",
  card: "(min-width: 1100px) 360px, (min-width: 640px) 50vw, 100vw",
  thumb: "(min-width: 640px) 240px, 40vw",
} as const;
