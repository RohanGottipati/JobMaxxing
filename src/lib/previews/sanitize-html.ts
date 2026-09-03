import createDOMPurify from "dompurify";

/**
 * DOCX files can embed arbitrary markup and mammoth passes some of it through,
 * so converted output is reduced to a fixed structural allowlist. Anything that
 * can execute, navigate, or load a remote resource is dropped rather than
 * escaped, and surviving links are forced to open in a new tab with no
 * referrer. Forbidden tags are removed; their inner text may remain as plain
 * text (safe) because DOMPurify's KEEP_CONTENT:false currently blanks all
 * text nodes, including allowed tags.
 */
const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "code", "hr",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "a", "span", "div",
];

const ALLOWED_ATTR = ["href", "title", "colspan", "rowspan", "start"];

type PurifyWindow = Parameters<typeof createDOMPurify>[0];

const instances = new WeakMap<object, ReturnType<typeof createDOMPurify>>();

function purifierFor(dom: PurifyWindow) {
  const cached = instances.get(dom as object);
  if (cached) return cached;
  const created = createDOMPurify(dom);
  instances.set(dom as object, created);
  return created;
}

/**
 * `dom` exists so this can be unit tested against a jsdom window; in the
 * browser the ambient window is used.
 */
export function sanitizeDocumentHtml(html: string, dom?: PurifyWindow) {
  const target = dom ?? (globalThis as unknown as PurifyWindow);
  const purify = purifierFor(target);

  // Keep text from allowed tags. Forbidden tags (script/img/…) are dropped;
  // KEEP_CONTENT:false in DOMPurify currently blanks *all* text nodes, so we
  // leave the default and rely on the allowlist + URI regexp instead.
  const cleaned = purify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "img", "svg", "math", "link", "meta"],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });

  // DOMPurify's allowlist cannot add attributes, so external links are hardened
  // after the fact on the sanitized string's parsed form.
  return hardenLinks(cleaned, target);
}

function hardenLinks(html: string, dom: PurifyWindow) {
  const documentRef = (dom as unknown as { document?: Document }).document;
  if (!documentRef) return html;
  const container = documentRef.createElement("div");
  container.innerHTML = html;
  for (const anchor of Array.from(container.querySelectorAll("a[href]"))) {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer nofollow");
  }
  return container.innerHTML;
}
