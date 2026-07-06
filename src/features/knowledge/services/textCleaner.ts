// Normalize whitespace, quotes, and line breaks while preserving paragraph
// structure, headings, tables, and bullet lists.
export function cleanText(text: string): string {
  if (!text) return "";
  let t = text
    // Normalize line endings.
    .replace(/\r\n?/g, "\n")
    // Smart quotes → ASCII.
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ");

  // Collapse 3+ blank lines to 2.
  t = t.replace(/\n{3,}/g, "\n\n");
  // Trim trailing whitespace per line.
  t = t
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
  // Collapse runs of spaces/tabs (but not newlines).
  t = t.replace(/[ \t]{2,}/g, " ");
  return t.trim();
}
