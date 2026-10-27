import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Safari may support stream readers without supporting async stream iteration. */
export async function readPdfPageText(page: PDFPageProxy, maxCharacters: number): Promise<string> {
  const reader = page.streamTextContent().getReader();
  let text = '';
  let completed = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) { completed = true; break; }
      for (const item of value.items) {
        if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ');
        if (text.length > maxCharacters) {
          throw new Error('Split this PDF into smaller chapters (up to 200,000 characters).');
        }
      }
    }
    return text;
  } finally {
    try { if (!completed) await reader.cancel(); }
    finally { reader.releaseLock(); }
  }
}
