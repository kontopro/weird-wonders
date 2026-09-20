import { z } from "zod";

const blockIdSchema = z.string().uuid("Το block ID πρέπει να είναι UUID.");
const shortTextSchema = z.string().max(500);
const longTextSchema = z.string().max(50_000);

const safeContentUrlSchema = z
  .string()
  .max(2_048)
  .refine((value) => {
    if (value.startsWith("/")) return !value.startsWith("//");

    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Χρησιμοποίησε http(s) URL ή site-relative path.");

const imageSchema = z
  .object({
    assetId: z.string().uuid(),
    alt: z.string().trim().min(1).max(500),
    caption: shortTextSchema.optional(),
    credit: shortTextSchema.optional(),
  })
  .strict();

const paragraphBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("paragraph"),
    data: z.object({ text: longTextSchema }).strict(),
  })
  .strict();

const headingBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("heading"),
    data: z
      .object({
        text: z.string().trim().min(1).max(300),
        level: z.union([z.literal(2), z.literal(3)]),
      })
      .strict(),
  })
  .strict();

const listBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("list"),
    data: z
      .object({
        style: z.enum(["bullet", "numbered"]),
        items: z.array(z.string().max(2_000)).min(1).max(100),
      })
      .strict(),
  })
  .strict();

const quoteBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("quote"),
    data: z
      .object({
        text: z.string().trim().min(1).max(5_000),
        attribution: shortTextSchema.optional(),
      })
      .strict(),
  })
  .strict();

const imageBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("image"),
    data: imageSchema,
  })
  .strict();

const imageGalleryDataSchema = z
  .object({
    columns: z.union([z.literal(2), z.literal(3)]),
    images: z.array(imageSchema).min(2).max(3),
  })
  .strict()
  .superRefine((gallery, context) => {
    if (gallery.images.length !== gallery.columns) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ο αριθμός εικόνων πρέπει να ταιριάζει με τις στήλες.",
        path: ["images"],
      });
    }
  });

const imageGalleryBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("imageGallery"),
    data: imageGalleryDataSchema,
  })
  .strict();

const tableDataSchema = z
  .object({
    columns: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
    rows: z.array(z.array(z.string().max(2_000)).max(20)).max(200),
    highlightedColumn: z.number().int().nonnegative().optional(),
  })
  .strict()
  .superRefine((table, context) => {
    table.rows.forEach((row, rowIndex) => {
      if (row.length !== table.columns.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Κάθε γραμμή πρέπει να έχει ένα κελί ανά στήλη.",
          path: ["rows", rowIndex],
        });
      }
    });

    if (table.highlightedColumn !== undefined && table.highlightedColumn >= table.columns.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Η επιλεγμένη στήλη δεν υπάρχει.",
        path: ["highlightedColumn"],
      });
    }
  });

const tableBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("table"),
    data: tableDataSchema,
  })
  .strict();

const factBoxBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("factBox"),
    data: z
      .object({
        title: shortTextSchema.optional(),
        text: z.string().trim().min(1).max(5_000),
      })
      .strict(),
  })
  .strict();

const scorecardDataSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    score: z.number().nonnegative(),
    maxScore: z.number().positive(),
    label: shortTextSchema.optional(),
    verdict: z.string().max(5_000).optional(),
  })
  .strict()
  .refine((scorecard) => scorecard.score <= scorecard.maxScore, {
    message: "Η βαθμολογία δεν μπορεί να ξεπερνά το μέγιστο.",
    path: ["score"],
  });

const scorecardBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("scorecard"),
    data: scorecardDataSchema,
  })
  .strict();

const embedBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("embed"),
    data: z
      .object({
        provider: z.enum(["youtube", "vimeo", "generic"]),
        url: safeContentUrlSchema,
        title: shortTextSchema.optional(),
      })
      .strict(),
  })
  .strict();

const dividerBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("divider"),
    data: z.object({ label: z.string().max(80).optional() }).strict(),
  })
  .strict();

const callToActionBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal("callToAction"),
    data: z
      .object({
        title: z.string().trim().min(1).max(300),
        text: z.string().max(2_000).optional(),
        label: z.string().trim().min(1).max(100),
        url: safeContentUrlSchema,
        tone: z.enum(["primary", "secondary", "accent"]).default("primary"),
      })
      .strict(),
  })
  .strict();

export const articleBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  headingBlockSchema,
  listBlockSchema,
  quoteBlockSchema,
  imageBlockSchema,
  imageGalleryBlockSchema,
  tableBlockSchema,
  factBoxBlockSchema,
  scorecardBlockSchema,
  embedBlockSchema,
  dividerBlockSchema,
  callToActionBlockSchema,
]);

export const articleContentDocumentSchema = z
  .object({
    version: z.literal(1),
    blocks: z.array(articleBlockSchema).max(500),
  })
  .strict()
  .superRefine((document, context) => {
    const seen = new Set<string>();

    document.blocks.forEach((block, index) => {
      if (seen.has(block.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Κάθε block πρέπει να έχει μοναδικό ID.",
          path: ["blocks", index, "id"],
        });
      }
      seen.add(block.id);
    });
  });

export type ArticleBlock = z.infer<typeof articleBlockSchema>;
export type ArticleBlockType = ArticleBlock["type"];
export type ArticleContentDocument = z.infer<typeof articleContentDocumentSchema>;

export function parseArticleContent(value: unknown): ArticleContentDocument {
  return articleContentDocumentSchema.parse(value);
}

export function safeParseArticleContent(value: unknown) {
  return articleContentDocumentSchema.safeParse(value);
}

export function createEmptyArticleContent(): ArticleContentDocument {
  return { version: 1, blocks: [] };
}

export function getArticleHeadings(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const document = value as { version?: unknown; blocks?: unknown };
  if (document.version !== 1 || !Array.isArray(document.blocks)) return [];

  return document.blocks.flatMap((candidate) => {
    const parsed = articleBlockSchema.safeParse(candidate);
    if (!parsed.success || parsed.data.type !== "heading") return [];
    return [{ id: parsed.data.id, text: parsed.data.data.text, level: parsed.data.data.level }];
  });
}
