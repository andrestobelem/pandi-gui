import DOMPurify from "dompurify";
import { Marked, type Tokens } from "marked";

const MARKDOWN_TAGS = [
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const parser = new Marked({
  gfm: true,
  renderer: {
    html(token: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(token.text);
    },
    heading(this, token: Tokens.Heading) {
      const level = Math.min(token.depth + 1, 6);
      return `<h${level}>${this.parser.parseInline(token.tokens)}</h${level}>\n`;
    },
    link(this, token: Tokens.Link) {
      return `<span class="response-link">${this.parser.parseInline(token.tokens)}</span>`;
    },
    image(token: Tokens.Image) {
      return `<span class="response-image-alt">${escapeHtml(token.text)}</span>`;
    },
  },
});

export function MarkdownResponse({ markdown }: { markdown: string }) {
  const parsed = parser.parse(markdown, { async: false });
  const html = DOMPurify.sanitize(parsed, {
    ALLOWED_ATTR: ["class"],
    ALLOWED_TAGS: MARKDOWN_TAGS,
  });

  return (
    <div
      className="response-markdown"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: raw HTML is escaped, active links and images are replaced, and the result is allowlist-sanitized.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
