// Copies the approved research project images from Drive into the site at every build,
// like the news pictures. A photo that can't be copied loads from Drive instead.
import { SHEET_CSV_URL, recordsFromCSV } from '../../lib/research.js';
import { driveId, driveImageUrl } from '../../lib/news.js';
import { fetchSheet } from '../../lib/publications.js';
import snapshot from '../../data/research-snapshot.json';

export async function getStaticPaths() {
  let records = snapshot;
  try {
    records = recordsFromCSV(await fetchSheet(SHEET_CSV_URL));
  } catch (err) {
    console.warn('[research] Using the saved copy: the sheet could not be read.', err.message);
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
      console.warn(`[research] Photo ${id} was not copied.`, err.message);
    }
  }
  return paths;
}

export function GET({ props }) {
  return new Response(props.bytes, { headers: { 'Content-Type': 'image/jpeg' } });
}
