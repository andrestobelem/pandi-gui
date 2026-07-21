import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { Marked, type Token, type Tokens } from "marked";

interface TableOfContentsEntry {
  depth: number;
  id: string;
  text: string;
}

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const SAFE_IMAGE_PROTOCOLS = new Set(["http:", "https:"]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hasAllowedProtocol(
  value: string,
  allowedProtocols: Set<string>,
): boolean {
  const trimmedValue = value.trim();
  const hasControlCharacter = Array.from(trimmedValue).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
  if (hasControlCharacter) {
    return false;
  }

  try {
    const url = new URL(trimmedValue, "https://pandi.invalid/");
    return allowedProtocols.has(url.protocol);
  } catch {
    return false;
  }
}

function isSafeLinkDestination(value: string): boolean {
  return hasAllowedProtocol(value, SAFE_LINK_PROTOCOLS);
}

function isSafeImageSource(value: string): boolean {
  return (
    hasAllowedProtocol(value, SAFE_IMAGE_PROTOCOLS) ||
    /^data:image\/(?:gif|jpeg|png|webp);base64,/iu.test(value)
  );
}

function tokenText(tokens: Token[]): string {
  return tokens
    .map((token) => {
      if ("tokens" in token && token.tokens) {
        return tokenText(token.tokens);
      }
      if ("text" in token && typeof token.text === "string") {
        return token.text;
      }
      return "";
    })
    .join("");
}

function createSlug(text: string, usedSlugs: Map<string, number>): string {
  const base =
    text
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-|-$/g, "") || "section";
  const occurrence = (usedSlugs.get(base) ?? 0) + 1;
  usedSlugs.set(base, occurrence);
  return occurrence === 1 ? base : `${base}-${occurrence}`;
}

function renderTableOfContents(entries: TableOfContentsEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const links = entries
    .map(
      ({ depth, id, text }) =>
        `<li class="toc-depth-${depth}"><a href="#${escapeHtml(id)}">${escapeHtml(text)}</a></li>`,
    )
    .join("\n");

  return `<nav class="table-of-contents" aria-label="Table of contents">
<h2>Contenido</h2>
<ol>
${links}
</ol>
</nav>`;
}

function createDocument(markdown: string, fallbackTitle: string): string {
  const tableOfContents: TableOfContentsEntry[] = [];
  const usedSlugs = new Map<string, number>();
  let title = fallbackTitle;
  let hasDocumentTitle = false;

  const parser = new Marked({
    gfm: true,
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(token.text);
      },
      link(this, token: Tokens.Link) {
        const text = this.parser.parseInline(token.tokens);
        if (!isSafeLinkDestination(token.href)) {
          return text;
        }
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
        return `<a href="${escapeHtml(token.href)}"${title}>${text}</a>`;
      },
      image(token: Tokens.Image) {
        if (!isSafeImageSource(token.href)) {
          return escapeHtml(token.text);
        }
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
        return `<img src="${escapeHtml(token.href)}" alt="${escapeHtml(token.text)}"${title}>`;
      },
      heading(this, token: Tokens.Heading) {
        const text = tokenText(token.tokens).trim();
        const id = createSlug(text, usedSlugs);
        if (token.depth === 1 && !hasDocumentTitle) {
          title = text;
          hasDocumentTitle = true;
        } else if (token.depth >= 2 && token.depth <= 3) {
          tableOfContents.push({ depth: token.depth, id, text });
        }
        return `<h${token.depth} id="${escapeHtml(id)}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
      },
    },
  });

  const content = parser.parse(markdown, { async: false });
  const tableOfContentsHtml = renderTableOfContents(tableOfContents);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root {
    color-scheme: light dark;
    --background: #f6f7f9;
    --surface: #ffffff;
    --text: #20242c;
    --muted: #616b7a;
    --accent: #2563eb;
    --border: #d9dee7;
    --code: #f0f2f5;
    --quote: #eef4ff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --background: #111318;
      --surface: #191c23;
      --text: #e7eaf0;
      --muted: #a7afbc;
      --accent: #7aa2ff;
      --border: #343a46;
      --code: #101218;
      --quote: #1b2944;
    }
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: var(--background);
    color: var(--text);
    font: 17px/1.7 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .document {
    width: min(100% - 2rem, 960px);
    margin: 2rem auto;
    padding: clamp(1.5rem, 5vw, 4.5rem);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 12px 40px rgb(0 0 0 / 8%);
  }
  h1, h2, h3, h4 { line-height: 1.25; scroll-margin-top: 1rem; }
  h1 { margin-top: 0; font-size: clamp(2rem, 5vw, 3.2rem); }
  h2 { margin-top: 2.5em; padding-bottom: .3em; border-bottom: 1px solid var(--border); }
  h3 { margin-top: 2em; }
  a { color: var(--accent); text-underline-offset: .18em; }
  a:hover { text-decoration-thickness: 2px; }
  p, li { max-width: 78ch; }
  .table-of-contents {
    margin: 2rem 0 3rem;
    padding: 1rem 1.5rem 1.25rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface) 85%, var(--accent));
  }
  .table-of-contents h2 { margin: 0 0 .75rem; border: 0; font-size: 1.2rem; }
  .table-of-contents ol { margin: 0; padding-left: 1.4rem; columns: 2 18rem; }
  .table-of-contents li { break-inside: avoid; margin: .2rem 0; }
  .table-of-contents .toc-depth-3 { margin-left: 1rem; font-size: .94em; }
  pre {
    overflow-x: auto;
    padding: 1rem 1.2rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--code);
    font-size: .9rem;
    line-height: 1.55;
  }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  :not(pre) > code { padding: .15em .35em; border-radius: 5px; background: var(--code); }
  blockquote {
    margin-left: 0;
    padding: .5rem 1rem;
    border-left: 4px solid var(--accent);
    background: var(--quote);
    color: var(--muted);
  }
  table { width: 100%; border-collapse: collapse; display: block; overflow-x: auto; }
  th, td { padding: .6rem .8rem; border: 1px solid var(--border); text-align: left; }
  th { background: var(--code); }
  img { max-width: 100%; height: auto; }
  hr { border: 0; border-top: 1px solid var(--border); margin: 3rem 0; }
  @media (max-width: 640px) {
    .document { width: 100%; margin: 0; border: 0; border-radius: 0; }
    .table-of-contents ol { columns: 1; }
  }
  @media print {
    body { background: #fff; color: #000; font-size: 11pt; }
    .document { width: 100%; margin: 0; padding: 0; border: 0; box-shadow: none; }
    a { color: inherit; }
    pre { white-space: pre-wrap; }
  }
</style>
</head>
<body>
<main class="document">
${tableOfContentsHtml}
${content}
</main>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const inputArgument = process.argv[2];
  if (!inputArgument) {
    throw new Error("Uso: npm run docs:html -- <archivo.md>");
  }

  const inputPath = resolve(inputArgument);
  const extension = extname(inputPath).toLowerCase();
  if (extension !== ".md" && extension !== ".markdown") {
    throw new Error("La entrada debe tener extensión .md o .markdown");
  }
  const outputPath = `${inputPath.slice(0, -extension.length)}.html`;
  const markdown = await readFile(inputPath, "utf8");
  const fallbackTitle = basename(inputPath, extension);
  const html = createDocument(markdown, fallbackTitle);
  await writeFile(outputPath, html, "utf8");
  console.log(`HTML generado: ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`No se pudo generar el HTML: ${message}`);
  process.exitCode = 1;
});
