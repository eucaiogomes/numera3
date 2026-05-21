/**
 * Extracts tabular data from a PDF by grouping text items by Y-coordinate.
 * Each "row" is a set of text items that share roughly the same vertical position.
 * The output mirrors parseCSVText so we can reuse the CSV column-mapping pipeline.
 */
export async function parsePDFToRows(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const pdfjsLib = await import('pdfjs-dist');

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).href;
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  // Collect all text spans across all pages with page-relative Y offsets
  const spans: { pageY: number; x: number; text: string }[] = [];
  let pageOffset = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const tf = item.transform as number[];
      const x = tf[4];
      // PDF Y is bottom-up; convert to top-down within page, then add page offset
      const y = pageOffset + (viewport.height - tf[5]);
      spans.push({ pageY: y, x, text: item.str.trim() });
    }

    pageOffset += viewport.height;
  }

  if (spans.length === 0) return { headers: [], rows: [] };

  // Bucket spans into rows by rounding pageY to nearest 4pt band
  const BAND = 4;
  const rowMap = new Map<number, { x: number; text: string }[]>();
  for (const span of spans) {
    const key = Math.round(span.pageY / BAND) * BAND;
    if (!rowMap.has(key)) rowMap.set(key, []);
    rowMap.get(key)!.push({ x: span.x, text: span.text });
  }

  // Sort rows top-to-bottom, then items left-to-right within each row
  const lines = Array.from(rowMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, items]) => items.sort((a, b) => a.x - b.x).map((i) => i.text));

  // The first line with >= 2 columns becomes the header
  const headerIdx = lines.findIndex((l) => l.length >= 2);
  if (headerIdx === -1) return { headers: [], rows: [] };

  const headers = lines[headerIdx];
  const colCount = headers.length;

  const rows = lines
    .slice(headerIdx + 1)
    .filter((l) => l.some((c) => c.trim()))
    .map((l) => Object.fromEntries(headers.map((h, i) => [h, l[i] ?? ''])));

  // Drop rows where all cells have < 2 chars (likely decorative lines / totals lines)
  const meaningful = rows.filter((r) =>
    Object.values(r).filter((v) => v.length >= 2).length >= Math.ceil(colCount / 2),
  );

  return { headers, rows: meaningful };
}
