// Copies the news pictures from Drive into the site at every build, so they
// keep working even if Google changes how it serves Drive images. A picture that
// can't be copied is skipped: the home page then loads it from Drive itself.
import { SHEET_CSV_URL, recordsFromCSV, driveId, driveImageUrl } from '../../lib/news.js';
import { fetchSheet } from '../../lib/publications.js';
import snapshot from '../../data/news-snapshot.json';

export async function getStaticPaths() {
  let records = snapshot;
  try {
    records = recordsFromCSV(await fetchSheet(SHEET_CSV_URL));
  } catch (err) {
    console.warn('[news] Using the saved copy: the sheet could not be read.', err.message);
  }

  const ids = [...new Set(records.map((r) => driveId(r.picture)).filter(Boolean))];
  const paths = [];
  for (const id of ids) {
    try {
      const res = await fetch(driveImageUrl(id), { signal: AbortSignal.timeout(20000) });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.startsWith('image/')) throw new Error(`HTTP ${res.status} ${type}`);
      paths.push({ params: { id }, props: { bytes: await res.arrayBuffer() } });
    } catch (err) {
      console.warn(`[news] Picture ${id} was not copied.`, err);
    }
  }
  return paths;
}

export function GET({ props }) {
  return new Response(props.bytes, { headers: { 'Content-Type': 'image/jpeg' } });
}
