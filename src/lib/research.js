// Research projects from the Public tab of the Nijs_ECIME_researchprojects
// sheet: only rows approved with Publish = yes. Shared by the page at build
// time and the visitor's browser, like the community lists.
import { esc, parseCSV } from './publications.js';
import { driveId, driveImageUrl } from './news.js';
import { AGE_GROUPS } from './community.js';

// Publish to web > the Public tab only > CSV. While empty, the saved copy shows (none yet).
export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWNFkvqToRNtEogJ6mh1VqVHpa6F9o2qiruWRX8V9TZYVxRE1zz3l9sO_fR3TmWxAKliu9lihGE-PJ/pub?gid=1769270131&single=true&output=csv';
// The web app address of researchprojects.gs. While empty, the form says it isn't open yet.
export const ENDPOINT = 'https://script.google.com/macros/s/AKfycbw_N3no-hd9dD5Wg-xy5pyy0Q6yi-jfoqazU7HOs0nX-a184_qIdMXT092vx973jalE/exec';

const KEYS = {
  title: 'title', acronym: 'acronym', researchers: 'researchers', institutions: 'institutions',
  country: 'country', period: 'period', status: 'status', funding: 'funding', discipline: 'discipline',
  aims: 'aims', methods: 'methods', instruments: 'instruments', 'age groups': 'ages', link: 'link',
  publications: 'publications', image: 'picture', 'instrument category': 'category',
};

const webAddress = (s) => (!s ? '' : /^https?:\/\//i.test(s) ? s : /^[a-z][a-z0-9+.-]*:/i.test(s) ? '' : 'https://' + s);
const split = (s) => String(s || '').split(/\s*[,;]\s*/).filter(Boolean);

// The name a publication uses in the publications sheet's Project column: the acronym, or else the title.
export const projectKey = (r) => (r.acronym || r.title || '').trim();

export function recordsFromCSV(text) {
  const rows = parseCSV(text);
  const header = (rows[0] || []).map((h) => String(h).trim().toLowerCase());
  if (!header.includes('title')) throw new Error('no Title column');
  return rows.slice(1).map((r) => {
    const rec = {};
    header.forEach((h, i) => { if (KEYS[h]) rec[KEYS[h]] = String(r[i] ?? '').replace(/\s+/g, ' ').trim(); });
    rec.status = (rec.status || '').toLowerCase();
    rec.link = webAddress(rec.link);
    return rec;
  }).filter((r) => r.title);
}

function pictureHtml(r) {
  const id = driveId(r.picture);
  if (!id) return '';
  return `<img class="cm-pic rp-pic" src="/research-pictures/${id}.jpg" alt="" loading="lazy" referrerpolicy="no-referrer" ` +
    `onerror="this.onerror=null;this.src='${driveImageUrl(id)}'">`;
}

// `withPubs` is the set of project names that have publications in the publications sheet.
function itemHtml(r, withPubs) {
  const title = esc(r.title) + (r.acronym ? ` <span class="rp-acr">(${esc(r.acronym)})</span>` : '');
  const when = [r.period, r.status].filter(Boolean).join(' · ');
  const facts = [r.discipline, r.instruments, r.ages].filter(Boolean).join(' · ');
  const key = projectKey(r);
  const links = [];
  if (r.link) links.push(`<a class="cm-link" href="${esc(r.link)}" target="_blank" rel="noopener">website →</a>`);
  if (withPubs.has(key.toLowerCase())) links.push(`<a class="cm-link" href="/publications/?project=${encodeURIComponent(key)}">publications →</a>`);
  return `<article class="cm-item rp-item${r.picture ? '' : ' rp-noimg'}">${pictureHtml(r)}<div>` +
    `<h3>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${title}</a>` : title}</h3>` +
    (r.researchers ? `<p class="cm-line">${esc(r.researchers)}</p>` : '') +
    `<p class="cm-line rp-inst">${esc([r.institutions, r.country].filter(Boolean).join(' · '))}</p>` +
    (when ? `<p class="cm-facts">${esc(when)}</p>` : '') +
    (facts ? `<p class="cm-facts rp-soft">${esc(facts)}</p>` : '') +
    (r.aims ? `<p class="cm-note">${esc(r.aims)}</p>` : '') +
    (r.methods ? `<p class="cm-note"><em>Methods:</em> ${esc(r.methods)}</p>` : '') +
    (r.funding ? `<p class="cm-note"><em>Funding:</em> ${esc(r.funding)}</p>` : '') +
    (links.length ? `<p class="rp-links">${links.join(' ')}</p>` : '') +
    `</div></article>`;
}

const STATUS_LABEL = { ongoing: 'Ongoing', completed: 'Completed' };

// Group by title (A–Z), status, country, discipline, age group or instrument category.
export function listHtml(recs, mode, withPubs = new Set()) {
  const sorted = [...recs].sort((a, b) => a.title.localeCompare(b.title));
  if (!sorted.length) return '<p class="cm-empty">Nothing here yet.</p>';
  const grid = (items) => `<div class="cm-grid rp-grid">${items.map((r) => itemHtml(r, withPubs)).join('')}</div>`;
  if (mode === 'title') return grid(sorted);
  const buckets = new Map();
  for (const r of sorted) {
    const keys = mode === 'status' ? [STATUS_LABEL[r.status]]
      : mode === 'country' ? split(r.country)
      : mode === 'discipline' ? split(r.discipline)
      : mode === 'ages' ? split(r.ages)
      : split(r.category);
    for (const k of keys.length && keys[0] ? keys : ['Not specified']) {
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(r);
    }
  }
  const order = (k) => (k === 'Not specified' ? '￿'
    : mode === 'status' ? (k === 'Ongoing' ? '0' : '1')
    : mode === 'ages' ? String(AGE_GROUPS.indexOf(k)).padStart(2, '0') : k.toLowerCase());
  return [...buckets.keys()].sort((a, b) => order(a).localeCompare(order(b))).map((k) =>
    `<h2 class="cm-group">${esc(k)} <span>${buckets.get(k).length}</span></h2>` + grid(buckets.get(k))).join('');
}

export const haystack = (r) => Object.values(r).join(' ').toLowerCase();
