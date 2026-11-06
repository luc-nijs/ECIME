// Shared by the publications page (when the site is built) and the visitor's
// browser (to read the sheet live and to filter), so both show the same list.
// Same system as lucnijs.be and EMP, without the author and role groups: on
// ECiME the list holds other people's work.

// Fill in the address of the published ECIME_publications sheet (File > Share >
// Publish to web > CSV). While it is empty, the saved copy in
// src/data/publications-snapshot.json shows.
export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIGu8H5PBQONDyFxDzLPOKgU9SjGpt1p845GHJ26jCk6pFk9JR6ehqjR049J5Wj5FxqQvoxI5IYjky/pub?output=csv';

export const TYPE_ORDER = ['journal article', 'book', 'book chapter', 'conference paper',
  'professional article', 'report', 'thesis'];
export const TYPE_LABEL = {
  'journal article': 'Journal articles',
  book: 'Books',
  'book chapter': 'Book chapters',
  'conference paper': 'Conference papers',
  'professional article': 'Professional and practitioner articles',
  report: 'Reports',
  thesis: 'Theses',
};
// A status other than "published" earns a badge and is listed first in its group.
const PENDING = /^(forthcoming|in preparation|in review|submitted|accepted|invited|in press)$/i;

export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function itemHtml(r) {
  const bits = [];
  const stamp = PENDING.test(r.status) ? r.status : (r.year || 'n.d.');
  bits.push('<span class="pb-a">' + esc(r.authors) + '</span> (' + esc(stamp) + '). ');
  // A title ending in ? or ! takes no extra full stop (APA).
  bits.push('<span class="pb-t">' + esc(r.title) + '</span>' + (/[?!.]$/.test(r.title) ? '' : '.'));
  if (r.venue) bits.push(' <span class="pb-v">' + esc(r.venue) + '</span>.');
  if (r.doi) {
    bits.push(' <a class="pb-doi" target="_blank" rel="noopener" href="https://doi.org/' + encodeURI(r.doi) +
              '">doi:' + esc(r.doi) + '</a>');
  } else if (r.url) {
    const label = /\.pdf(\?|#|$)/i.test(r.url) ? 'pdf' : 'link';
    bits.push(' <a class="pb-doi" target="_blank" rel="noopener" href="' + esc(r.url) + '">' + label + '</a>');
  }
  if (r.isbn) bits.push(' <span class="pb-doi">ISBN ' + esc(r.isbn) + '</span>');
  if (r.instrument) bits.push('<span class="pb-badge">' + esc(r.instrument) + '</span>');
  if (PENDING.test(r.status) && r.year) bits.push('<span class="pb-badge">' + esc(r.year) + '</span>');
  return '<div class="pb-item">' + bits.join('') + '</div>';
}

function groupsFor(recs, mode) {
  const buckets = new Map();
  const push = (key, r) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(r);
  };

  if (mode === 'none') return [['', recs]];

  if (mode === 'year') {
    for (const r of recs) push(r.year ? String(r.year) : 'Undated / forthcoming', r);
    const keys = [...buckets.keys()].sort((a, b) => {
      if (!/^\d/.test(a)) return -1;
      if (!/^\d/.test(b)) return 1;
      return Number(b) - Number(a);
    });
    return keys.map((k) => [k, buckets.get(k)]);
  }

  // type
  for (const r of recs) push(r.type || 'other', r);
  const keys = [...buckets.keys()].sort(
    (a, b) => (TYPE_ORDER.indexOf(a) + 1 || 99) - (TYPE_ORDER.indexOf(b) + 1 || 99));
  return keys.map((k) => [TYPE_LABEL[k] || (k === 'other' ? 'Other' : k), buckets.get(k)]);
}

// Without grouping the list is alphabetical by author, as in an APA reference list.
export function listHtml(recs, mode) {
  const html = [];
  const pendingFirst = (r) => (PENDING.test(r.status) ? 0 : 1);
  for (const [label, items] of groupsFor(recs, mode)) {
    items.sort(mode === 'none'
      ? (a, b) => String(a.authors).localeCompare(String(b.authors)) || (Number(a.year || 0) - Number(b.year || 0))
      : (a, b) => (pendingFirst(a) - pendingFirst(b)) ||
                  (Number(b.year || 0) - Number(a.year || 0)) ||
                  String(a.authors).localeCompare(String(b.authors)));
    if (label) html.push('<h2 class="pb-group">' + esc(label) + ' <span>' + items.length + '</span></h2>');
    for (const r of items) html.push(itemHtml(r));
  }
  return html.join('') || '<div class="pb-item pb-v">Nothing matches these filters.</div>';
}

export function countText(recs) {
  const withDoi = recs.filter((r) => r.doi).length;
  return recs.length + ' publication' + (recs.length === 1 ? '' : 's') + ' · ' + withDoi + ' with DOI';
}

// Minimal RFC-4180 CSV reader: handles quoted fields, escaped "" quotes,
// and commas or newlines inside quotes. Sheets exports all three.
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
    } else if (c === '"') { inQuotes = true;
    } else if (c === ',') { row.push(field); field = '';
    } else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '';
    } else if (c !== '\r') { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ''));
}

// Headers are matched case-insensitively and by substring, so a column can be
// renamed ("Journal / book", "Co-authors") without touching code.
const COLUMN_ALIASES = {
  year: ['year', 'date', 'published'],
  authors: ['author', 'authors', 'with'],
  title: ['title', 'publication', 'name'],
  venue: ['venue', 'journal', 'book', 'source', 'outlet', 'in'],
  type: ['type', 'kind', 'category', 'genre'],
  instrument: ['instrument'],
  status: ['status', 'stage', 'state'],
  doi: ['doi'],
  url: ['url', 'link', 'website'],
  isbn: ['isbn'],
  language: ['language', 'lang', 'taal'],
  publish: ['publish', 'show', 'visible'],
};

function mapHeaders(header) {
  const lower = header.map((h) => String(h || '').trim().toLowerCase());
  const idx = {};
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const at = lower.findIndex((h) => h === alias || h.includes(alias));
      if (at !== -1) { idx[key] = at; break; }
    }
  }
  return idx;
}

export function recordsFromCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const idx = mapHeaders(rows[0]);
  const out = [];
  for (const r of rows.slice(1)) {
    const get = (k) => (idx[k] === undefined ? '' : String(r[idx[k]] ?? '').trim());
    // Only an explicit no hides a row, so an empty Publish column is harmless.
    if (/^(n|no|false|0|hide)$/i.test(get('publish'))) continue;
    const rec = {};
    for (const k of ['authors', 'title', 'venue', 'type', 'instrument', 'status', 'doi', 'url', 'isbn', 'language']) {
      // Collapse stray line breaks pasted into a cell, so one Enter in the
      // sheet cannot break the list layout.
      if (get(k)) rec[k] = get(k).replace(/\s+/g, ' ').trim();
    }
    rec.title = rec.title || '(untitled)';
    rec.status = (rec.status || 'published').toLowerCase();
    rec.type = (rec.type || '').toLowerCase();
    // A DOI typed as a full URL still works.
    if (rec.doi) rec.doi = decodeURIComponent(rec.doi.replace(/^\s*(https?:\/\/)?(dx\.)?doi\.org\//i, ''));
    const ym = /(\d{4})/.exec(get('year'));
    rec.year = ym ? ym[1] : '';
    out.push(rec);
  }
  return out;
}

// Reads a published sheet; throws when there is no address yet or it can't be read.
export async function fetchSheet(url, { live = false } = {}) {
  if (!url) throw new Error('no sheet address yet');
  const full = live ? url + '&v=' + Math.floor(Date.now() / 60000) : url;
  const res = await fetch(full, live ? { cache: 'no-cache' } : { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}
