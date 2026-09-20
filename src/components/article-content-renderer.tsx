import type { ReactNode } from "react";
import {
  articleBlockSchema,
  type ArticleBlock,
  type ArticleContentDocument,
} from "@/lib/article-content";

export type PublicMediaAsset = {
  src: string;
  width?: number;
  height?: number;
};

type ArticleContentRendererProps = {
  document: ArticleContentDocument | unknown;
  resolveAsset?: (assetId: string) => PublicMediaAsset | undefined;
};

function rawBlocks(document: unknown): unknown[] | undefined {
  if (!document || typeof document !== "object") return undefined;
  const candidate = document as { version?: unknown; blocks?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.blocks)) return undefined;
  return candidate.blocks;
}

function unsupportedBlock(block: unknown, key: string) {
  const type =
    block && typeof block === "object" && "type" in block && typeof block.type === "string"
      ? block.type
      : "άγνωστο";

  return (
    <aside className="unsupported-block" key={key} role="note">
      Αυτό το τμήμα περιεχομένου ({type}) δεν υποστηρίζεται ακόμη.
    </aside>
  );
}

function assertNever(block: never): never {
  throw new Error(`Unsupported article block: ${JSON.stringify(block)}`);
}

function renderImage(
  image: Extract<ArticleBlock, { type: "image" }>["data"],
  key: string,
  resolveAsset?: ArticleContentRendererProps["resolveAsset"],
) {
  const asset = resolveAsset?.(image.assetId);
  if (!asset) return unsupportedBlock({ type: "image" }, key);

  return (
    <figure className="content-image" key={key}>
      <img
        src={asset.src}
        alt={image.alt}
        width={asset.width}
        height={asset.height}
        loading="lazy"
      />
      {(image.caption || image.credit) && (
        <figcaption>
          {image.caption && <span>{image.caption}</span>}
          {image.credit && <small>{image.credit}</small>}
        </figcaption>
      )}
    </figure>
  );
}

function renderBlock(
  block: ArticleBlock,
  index: number,
  resolveAsset?: ArticleContentRendererProps["resolveAsset"],
): ReactNode {
  switch (block.type) {
    case "paragraph":
      return <p className={index === 0 ? "lead" : undefined}>{block.data.text}</p>;
    case "heading":
      return block.data.level === 2 ? (
        <h2 id={block.id}>{block.data.text}</h2>
      ) : (
        <h3 id={block.id}>{block.data.text}</h3>
      );
    case "list": {
      const List = block.data.style === "numbered" ? "ol" : "ul";
      return (
        <List className="content-list">
          {block.data.items.map((item, itemIndex) => (
            <li key={`${block.id}-${itemIndex}`}>{item}</li>
          ))}
        </List>
      );
    }
    case "quote":
      return (
        <blockquote>
          <p>{block.data.text}</p>
          {block.data.attribution && <cite>{block.data.attribution}</cite>}
        </blockquote>
      );
    case "image":
      return renderImage(block.data, block.id, resolveAsset);
    case "imageGallery":
      return (
        <div className={`content-gallery columns-${block.data.columns}`}>
          {block.data.images.map((image, imageIndex) =>
            renderImage(image, `${block.id}-${imageIndex}`, resolveAsset),
          )}
        </div>
      );
    case "table":
      return (
        <div className="content-table-wrap">
          <table>
            <thead>
              <tr>
                {block.data.columns.map((column, columnIndex) => (
                  <th
                    key={`${block.id}-heading-${columnIndex}`}
                    className={
                      block.data.highlightedColumn === columnIndex ? "is-highlighted" : undefined
                    }
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.data.rows.map((row, rowIndex) => (
                <tr key={`${block.id}-row-${rowIndex}`}>
                  {row.map((cell, columnIndex) => (
                    <td
                      key={`${block.id}-${rowIndex}-${columnIndex}`}
                      className={
                        block.data.highlightedColumn === columnIndex ? "is-highlighted" : undefined
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "factBox":
      return (
        <aside className="fact-box">
          <strong>{block.data.title ?? "Κράτησέ το"}</strong>
          <p>{block.data.text}</p>
        </aside>
      );
    case "scorecard":
      return (
        <aside className="content-scorecard">
          <div>
            <strong>{block.data.title}</strong>
            {block.data.label && <span>{block.data.label}</span>}
          </div>
          <b>
            {block.data.score}/{block.data.maxScore}
          </b>
          {block.data.verdict && <p>{block.data.verdict}</p>}
        </aside>
      );
    case "embed":
      return (
        <aside className="content-embed">
          <span>{block.data.provider}</span>
          <a href={block.data.url}>{block.data.title ?? "Άνοιγμα εξωτερικού περιεχομένου"}</a>
        </aside>
      );
    case "divider":
      return (
        <div className="content-divider" role="separator">
          {block.data.label && <span>{block.data.label}</span>}
        </div>
      );
    case "callToAction":
      return (
        <aside className={`content-cta tone-${block.data.tone}`}>
          <div>
            <strong>{block.data.title}</strong>
            {block.data.text && <p>{block.data.text}</p>}
          </div>
          <a href={block.data.url}>{block.data.label}</a>
        </aside>
      );
    default:
      return assertNever(block);
  }
}

export function ArticleContentRenderer({ document, resolveAsset }: ArticleContentRendererProps) {
  const blocks = rawBlocks(document);

  if (!blocks) {
    return unsupportedBlock({ type: "document" }, "invalid-document");
  }

  return blocks.map((candidate, index) => {
    const parsed = articleBlockSchema.safeParse(candidate);
    if (!parsed.success) return unsupportedBlock(candidate, `unsupported-${index}`);
    return <div key={parsed.data.id}>{renderBlock(parsed.data, index, resolveAsset)}</div>;
  });
}
