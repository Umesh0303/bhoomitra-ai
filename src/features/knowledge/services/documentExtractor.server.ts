import type { SourceBlock } from "./chunker";
import { cleanText } from "./textCleaner";

/**
 * Extract text blocks from a document buffer. Preserves per-page boundaries
 * for PDFs (used later for citations). Dynamic-imports heavy libs so they
 * never ship in the client bundle.
 */
export async function extractBlocks(
  bytes: Uint8Array,
  mimeType: string,
): Promise<SourceBlock[]> {
  if (mimeType === "application/pdf") {
    return extractPdf(bytes);
  }
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(bytes);
  }
  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    const text = new TextDecoder().decode(bytes);
    return [{ text: cleanText(text) }];
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function extractPdf(bytes: Uint8Array): Promise<SourceBlock[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const blocks: SourceBlock[] = [];
  for (let i = 0; i < pages.length; i++) {
    const cleaned = cleanText(pages[i] ?? "");
    if (!cleaned) continue;
    // Detect heading-ish first line.
    const firstLine = cleaned.split("\n", 1)[0] ?? "";
    const heading =
      firstLine.length > 0 && firstLine.length < 80 && /^[A-Z0-9]/.test(firstLine)
        ? firstLine
        : undefined;
    blocks.push({ text: cleaned, page: i + 1, heading });
  }
  return blocks;
}

async function extractDocx(bytes: Uint8Array): Promise<SourceBlock[]> {
  const mammoth = await import("mammoth");
  // mammoth expects a Buffer-like object; ArrayBuffer works in workerd.
  const result = await mammoth.extractRawText({
    arrayBuffer: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  });
  const cleaned = cleanText(result.value ?? "");
  return cleaned ? [{ text: cleaned }] : [];
}
