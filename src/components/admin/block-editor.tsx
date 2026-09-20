import {
  ChevronDown,
  ChevronUp,
  Copy,
  Gauge,
  Heading2,
  Image,
  Images,
  Link2,
  List,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Sparkles,
  Table2,
  Trash2,
} from "lucide-react";
import { ArticleContentRenderer } from "@/components/article-content-renderer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  articleContentDocumentSchema,
  type ArticleBlock,
  type ArticleBlockType,
  type ArticleContentDocument,
} from "@/lib/article-content";

type BlockEditorProps = {
  document: ArticleContentDocument;
  onChange: (document: ArticleContentDocument) => void;
  onDirty: () => void;
};

const blockOptions: Array<{
  type: ArticleBlockType;
  label: string;
  description: string;
  icon: typeof Pilcrow;
}> = [
  { type: "paragraph", label: "Παράγραφος", description: "Απλό σώμα κειμένου", icon: Pilcrow },
  { type: "heading", label: "Επικεφαλίδα", description: "Ενότητα H2 ή H3", icon: Heading2 },
  { type: "list", label: "Λίστα", description: "Bullets ή αρίθμηση", icon: List },
  { type: "quote", label: "Παράθεμα", description: "Κείμενο και προαιρετική πηγή", icon: Quote },
  { type: "image", label: "Εικόνα", description: "Εικόνα με alt text", icon: Image },
  { type: "imageGallery", label: "Gallery", description: "Δύο ή τρεις εικόνες", icon: Images },
  { type: "table", label: "Πίνακας", description: "Στήλες και γραμμές δεδομένων", icon: Table2 },
  { type: "factBox", label: "FACT box", description: "Τόνισε μια πληροφορία", icon: Sparkles },
  { type: "scorecard", label: "Scorecard", description: "Βαθμολογία και verdict", icon: Gauge },
  { type: "embed", label: "Embed", description: "Ασφαλής εξωτερικός σύνδεσμος", icon: Link2 },
  { type: "divider", label: "Divider", description: "Οπτικός διαχωρισμός", icon: Minus },
  {
    type: "callToAction",
    label: "Call to action",
    description: "Τίτλος και σύνδεσμος",
    icon: Link2,
  },
];

function createImage() {
  return {
    assetId: crypto.randomUUID(),
    alt: "Περιγραφή εικόνας",
    caption: "",
    credit: "",
  };
}

function createBlock(type: ArticleBlockType): ArticleBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "paragraph":
      return { id, type, data: { text: "" } };
    case "heading":
      return { id, type, data: { text: "Νέα ενότητα", level: 2 } };
    case "list":
      return { id, type, data: { style: "bullet", items: ["Νέο στοιχείο"] } };
    case "quote":
      return { id, type, data: { text: "Νέο παράθεμα", attribution: "" } };
    case "image":
      return { id, type, data: createImage() };
    case "imageGallery":
      return { id, type, data: { columns: 2, images: [createImage(), createImage()] } };
    case "table":
      return { id, type, data: { columns: ["Στήλη"], rows: [[""]] } };
    case "factBox":
      return { id, type, data: { title: "Κράτησέ το", text: "Νέο fact" } };
    case "scorecard":
      return { id, type, data: { title: "Βαθμολογία", score: 8, maxScore: 10 } };
    case "embed":
      return { id, type, data: { provider: "generic", url: "/", title: "Εξωτερικό περιεχόμενο" } };
    case "divider":
      return { id, type, data: { label: "" } };
    case "callToAction":
      return {
        id,
        type,
        data: { title: "Μάθε περισσότερα", text: "", label: "Άνοιγμα", url: "/", tone: "primary" },
      };
  }
}

function blockLabel(type: ArticleBlockType) {
  return blockOptions.find((option) => option.type === type)?.label ?? type;
}

function parseTableRows(value: string, columnCount: number) {
  return value
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      return Array.from({ length: columnCount }, (_, index) => cells[index] ?? "");
    });
}

function BlockFields({
  block,
  onChange,
}: {
  block: ArticleBlock;
  onChange: (block: ArticleBlock) => void;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <textarea
          rows={6}
          value={block.data.text}
          onChange={(event) => onChange({ ...block, data: { text: event.target.value } })}
          placeholder="Γράψε την παράγραφο…"
        />
      );
    case "heading":
      return (
        <div className="block-field-row">
          <input
            value={block.data.text}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, text: event.target.value } })
            }
          />
          <select
            value={block.data.level}
            onChange={(event) =>
              onChange({
                ...block,
                data: { ...block.data, level: Number(event.target.value) as 2 | 3 },
              })
            }
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
        </div>
      );
    case "list":
      return (
        <>
          <select
            value={block.data.style}
            onChange={(event) =>
              onChange({
                ...block,
                data: { ...block.data, style: event.target.value as "bullet" | "numbered" },
              })
            }
          >
            <option value="bullet">Bullets</option>
            <option value="numbered">Αριθμημένη</option>
          </select>
          <textarea
            rows={5}
            value={block.data.items.join("\n")}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, items: event.target.value.split("\n") } })
            }
            placeholder="Ένα στοιχείο ανά γραμμή"
          />
        </>
      );
    case "quote":
      return (
        <>
          <textarea
            rows={4}
            value={block.data.text}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, text: event.target.value } })
            }
          />
          <input
            value={block.data.attribution ?? ""}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, attribution: event.target.value } })
            }
            placeholder="Πηγή ή δημιουργός (προαιρετικό)"
          />
        </>
      );
    case "image":
      return (
        <>
          <div className="block-storage-note">
            <Image /> Η σύνδεση αρχείου θα ενεργοποιηθεί με το Supabase Storage.
          </div>
          <input
            value={block.data.alt}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, alt: event.target.value } })
            }
            placeholder="Alt text"
          />
          <input
            value={block.data.caption ?? ""}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, caption: event.target.value } })
            }
            placeholder="Λεζάντα"
          />
          <input
            value={block.data.credit ?? ""}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, credit: event.target.value } })
            }
            placeholder="Credit"
          />
        </>
      );
    case "imageGallery": {
      const updateImage = (
        imageIndex: number,
        field: "alt" | "caption" | "credit",
        value: string,
      ) =>
        onChange({
          ...block,
          data: {
            ...block.data,
            images: block.data.images.map((image, index) =>
              index === imageIndex ? { ...image, [field]: value } : image,
            ),
          },
        });
      const setColumns = (columns: 2 | 3) => {
        const images = [...block.data.images];
        while (images.length < columns) images.push(createImage());
        onChange({ ...block, data: { columns, images: images.slice(0, columns) } });
      };
      return (
        <>
          <select
            value={block.data.columns}
            onChange={(event) => setColumns(Number(event.target.value) as 2 | 3)}
          >
            <option value={2}>2 εικόνες</option>
            <option value={3}>3 εικόνες</option>
          </select>
          <div className="gallery-editor-grid">
            {block.data.images.map((image, imageIndex) => (
              <fieldset key={image.assetId}>
                <legend>Εικόνα {imageIndex + 1}</legend>
                <input
                  value={image.alt}
                  onChange={(event) => updateImage(imageIndex, "alt", event.target.value)}
                  placeholder="Alt text"
                />
                <input
                  value={image.caption ?? ""}
                  onChange={(event) => updateImage(imageIndex, "caption", event.target.value)}
                  placeholder="Λεζάντα"
                />
                <input
                  value={image.credit ?? ""}
                  onChange={(event) => updateImage(imageIndex, "credit", event.target.value)}
                  placeholder="Credit"
                />
              </fieldset>
            ))}
          </div>
        </>
      );
    }
    case "table": {
      const columnsValue = block.data.columns.join(", ");
      const rowsValue = block.data.rows.map((row) => row.join(" | ")).join("\n");
      return (
        <>
          <input
            value={columnsValue}
            onChange={(event) => {
              const columns = event.target.value
                .split(",")
                .map((column) => column.trim())
                .filter(Boolean);
              const safeColumns = columns.length ? columns : ["Στήλη"];
              onChange({
                ...block,
                data: {
                  ...block.data,
                  columns: safeColumns,
                  rows: block.data.rows.map((row) =>
                    Array.from({ length: safeColumns.length }, (_, index) => row[index] ?? ""),
                  ),
                },
              });
            }}
            placeholder="Στήλη 1, Στήλη 2"
          />
          <textarea
            rows={6}
            value={rowsValue}
            onChange={(event) =>
              onChange({
                ...block,
                data: {
                  ...block.data,
                  rows: parseTableRows(event.target.value, block.data.columns.length),
                },
              })
            }
            placeholder="Κελί 1 | Κελί 2"
          />
          <select
            value={block.data.highlightedColumn ?? ""}
            onChange={(event) =>
              onChange({
                ...block,
                data: {
                  ...block.data,
                  highlightedColumn:
                    event.target.value === "" ? undefined : Number(event.target.value),
                },
              })
            }
          >
            <option value="">Χωρίς τονισμένη στήλη</option>
            {block.data.columns.map((column, index) => (
              <option key={`${column}-${index}`} value={index}>
                {column}
              </option>
            ))}
          </select>
        </>
      );
    }
    case "factBox":
      return (
        <>
          <input
            value={block.data.title ?? ""}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, title: event.target.value } })
            }
            placeholder="Τίτλος"
          />
          <textarea
            rows={4}
            value={block.data.text}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, text: event.target.value } })
            }
          />
        </>
      );
    case "scorecard":
      return (
        <>
          <input
            value={block.data.title}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, title: event.target.value } })
            }
            placeholder="Τίτλος"
          />
          <div className="block-field-row">
            <input
              type="number"
              min={0}
              value={block.data.score}
              onChange={(event) =>
                onChange({ ...block, data: { ...block.data, score: Number(event.target.value) } })
              }
            />
            <input
              type="number"
              min={1}
              value={block.data.maxScore}
              onChange={(event) =>
                onChange({
                  ...block,
                  data: { ...block.data, maxScore: Number(event.target.value) },
                })
              }
            />
          </div>
          <input
            value={block.data.label ?? ""}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, label: event.target.value } })
            }
            placeholder="Label"
          />
          <textarea
            rows={3}
            value={block.data.verdict ?? ""}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, verdict: event.target.value } })
            }
            placeholder="Verdict"
          />
        </>
      );
    case "embed":
      return (
        <>
          <select
            value={block.data.provider}
            onChange={(event) =>
              onChange({
                ...block,
                data: {
                  ...block.data,
                  provider: event.target.value as "youtube" | "vimeo" | "generic",
                },
              })
            }
          >
            <option value="generic">Generic link</option>
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
          </select>
          <input
            value={block.data.url}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, url: event.target.value } })
            }
            placeholder="https://…"
          />
          <input
            value={block.data.title ?? ""}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, title: event.target.value } })
            }
            placeholder="Τίτλος"
          />
        </>
      );
    case "divider":
      return (
        <input
          value={block.data.label ?? ""}
          onChange={(event) => onChange({ ...block, data: { label: event.target.value } })}
          placeholder="Προαιρετική ετικέτα"
        />
      );
    case "callToAction":
      return (
        <>
          <input
            value={block.data.title}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, title: event.target.value } })
            }
            placeholder="Τίτλος"
          />
          <textarea
            rows={3}
            value={block.data.text ?? ""}
            onChange={(event) =>
              onChange({ ...block, data: { ...block.data, text: event.target.value } })
            }
            placeholder="Σύντομο κείμενο"
          />
          <div className="block-field-row">
            <input
              value={block.data.label}
              onChange={(event) =>
                onChange({ ...block, data: { ...block.data, label: event.target.value } })
              }
              placeholder="Κείμενο κουμπιού"
            />
            <input
              value={block.data.url}
              onChange={(event) =>
                onChange({ ...block, data: { ...block.data, url: event.target.value } })
              }
              placeholder="URL"
            />
          </div>
          <select
            value={block.data.tone}
            onChange={(event) =>
              onChange({
                ...block,
                data: {
                  ...block.data,
                  tone: event.target.value as "primary" | "secondary" | "accent",
                },
              })
            }
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="accent">Accent</option>
          </select>
        </>
      );
  }
}

export function BlockEditor({ document, onChange, onDirty }: BlockEditorProps) {
  const validation = articleContentDocumentSchema.safeParse(document);
  const updateBlocks = (blocks: ArticleBlock[]) => {
    onChange({ version: 1, blocks });
    onDirty();
  };
  const replace = (index: number, block: ArticleBlock) =>
    updateBlocks(
      document.blocks.map((current, currentIndex) => (currentIndex === index ? block : current)),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= document.blocks.length) return;
    const blocks = [...document.blocks];
    [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
    updateBlocks(blocks);
  };

  return (
    <div className="block-editor">
      <header className="block-editor-header">
        <div>
          <strong>Περιεχόμενο άρθρου</strong>
          <span>{document.blocks.length} blocks</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline">
              <Plus /> Προσθήκη block <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="add-block-menu">
            <DropdownMenuLabel>Τι θέλεις να προσθέσεις;</DropdownMenuLabel>
            <div className="add-block-grid">
              {blockOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <DropdownMenuItem
                    key={option.type}
                    className="add-block-option"
                    onSelect={() => updateBlocks([...document.blocks, createBlock(option.type)])}
                  >
                    <span className="add-block-icon">
                      <Icon />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {document.blocks.length === 0 && (
        <div className="block-editor-empty">
          <Pilcrow />
          <strong>Το άρθρο δεν έχει ακόμη περιεχόμενο.</strong>
          <span>Πρόσθεσε το πρώτο block χωρίς να γράψεις JSON.</span>
        </div>
      )}
      <div className="block-editor-list">
        {document.blocks.map((block, index) => (
          <section className="block-card" key={block.id}>
            <header>
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{blockLabel(block.type)}</strong>
              </div>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Μετακίνηση πάνω"
                >
                  <ChevronUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === document.blocks.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Μετακίνηση κάτω"
                >
                  <ChevronDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const copy = structuredClone(block);
                    copy.id = crypto.randomUUID();
                    updateBlocks([
                      ...document.blocks.slice(0, index + 1),
                      copy,
                      ...document.blocks.slice(index + 1),
                    ]);
                  }}
                  aria-label="Δημιουργία αντιγράφου"
                >
                  <Copy />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="admin-danger"
                  onClick={() =>
                    updateBlocks(
                      document.blocks.filter((_, currentIndex) => currentIndex !== index),
                    )
                  }
                  aria-label="Διαγραφή block"
                >
                  <Trash2 />
                </Button>
              </div>
            </header>
            <div className="block-card-fields">
              <BlockFields block={block} onChange={(next) => replace(index, next)} />
            </div>
            <details className="block-preview">
              <summary>Προεπισκόπηση block</summary>
              <div className="article-copy">
                <ArticleContentRenderer document={{ version: 1, blocks: [block] }} />
              </div>
            </details>
          </section>
        ))}
      </div>
      <footer
        className={validation.success ? "block-validation valid" : "block-validation invalid"}
      >
        {validation.success
          ? "Το περιεχόμενο είναι έγκυρο και έτοιμο για αποθήκευση."
          : `Χρειάζεται διόρθωση: ${validation.error.issues[0]?.message ?? "Μη έγκυρο περιεχόμενο."}`}
      </footer>
    </div>
  );
}
