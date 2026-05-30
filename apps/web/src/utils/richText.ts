const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'CODE',
  'PRE',
  'A',
]);

const ALLOWED_ATTR: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
};

function isSafeHref(value: string) {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}

export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return String(input);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  const body = doc.body;
  if (!body) {
    return String(input);
  }

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      if (!ALLOWED_TAGS.has(el.tagName)) {
        const text = doc.createTextNode(el.textContent ?? '');
        el.replaceWith(text);
        return;
      }

      const allowed = ALLOWED_ATTR[el.tagName] ?? new Set<string>();
      Array.from(el.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        if (!allowed.has(attr.name)) {
          el.removeAttribute(attr.name);
          return;
        }

        if (el.tagName === 'A' && attrName === 'href' && !isSafeHref(attr.value)) {
          el.removeAttribute('href');
        }
      });

      if (el.tagName === 'A') {
        if (!el.getAttribute('href')) {
          el.removeAttribute('target');
          el.removeAttribute('rel');
        } else {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }
    }

    Array.from(node.childNodes).forEach((child) => walk(child));
  };

  walk(body);

  return body.innerHTML.trim();
}

export function stripRichText(input: string | null | undefined): string {
  if (!input) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return String(input).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  const body = doc.body;
  if (!body) {
    return String(input).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return (body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function isRichTextEmpty(input: string | null | undefined): boolean {
  return stripRichText(input).length === 0;
}
