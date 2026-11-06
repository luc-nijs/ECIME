// Community entries (persons, organisations, projects) from the Public tab of
// the ECIME_community sheet: only rows approved with Publish = yes, without
// email or consent. Shared by the pages at build time and the visitor's browser.
import { esc, parseCSV } from './publications.js';
import { driveId, driveImageUrl } from './news.js';

// Publish to web > the Public tab only > CSV. While empty, the saved copy shows (none yet).
export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6S0r1-pAALnc1UrDHubZacpDXbo9OKcOt_u8yFLDv6yr06jpppSLUm6I2FmzG3nQB2mqZHcUQ0GUd/pub?gid=665691995&single=true&output=csv';
// The web app address of the community script (community.gs). While empty, the form says it isn't open yet.
export const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzfYIuuDFWajg6A1sDp0DfGKomJOtwmU2e_w97dO2GGpTzb6EnJJYqsHLkPOYLsr5KT/exec';

export const TYPES = {
  person: { page: '/individuals', label: 'Individuals' },
  organisation: { page: '/organisations', label: 'Organisations' },
  project: { page: '/educational-projects', label: 'Projects' },
};
export const AGE_GROUPS = ['0–3 years', '3–6 years', '6–8 years'];

const KEYS = {
  type: 'type', name: 'name', affiliation: 'affiliation', 'organisation type': 'orgType',
  organisations: 'organisations', period: 'period', role: 'role', country: 'country', city: 'city',
  instruments: 'instruments', 'age groups': 'ages', note: 'note', link: 'link', photo: 'picture',
  'instrument category': 'category',
};

const webAddress = (s) => (!s ? '' : /^https?:\/\//i.test(s) ? s : /^[a-z][a-z0-9+.-]*:/i.test(s) ? '' : 'https://' + s);
const split = (s) => String(s || '').split(/\s*[,;]\s*/).filter(Boolean);

// Throws when the sheet has no Name column (an error page, for instance).
export function recordsFromCSV(text) {
  const rows = parseCSV(text);
  const header = (rows[0] || []).map((h) => String(h).trim().toLowerCase());
  if (!header.includes('name')) throw new Error('no Name column');
  return rows.slice(1).map((r) => {
    const rec = {};
    header.forEach((h, i) => { if (KEYS[h]) rec[KEYS[h]] = String(r[i] ?? '').replace(/\s+/g, ' ').trim(); });
    rec.type = (rec.type || '').toLowerCase();
    rec.link = webAddress(rec.link);
    return rec;
  }).filter((r) => r.name && TYPES[r.type]);
}

// Persons sort by surname (the last word of the name), the others by name.
const sortKey = (r) => (r.type === 'person' ? r.name.split(' ').slice(-1)[0] + ' ' + r.name : r.name).toLowerCase();

function initials(name) {
  const words = name.split(' ').filter((w) => /^\p{L}/u.test(w));
  return ((words[0]?.[0] || '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

// A Drive photo loads from the site's own copy, made at the nightly build; a
// photo approved since then falls back to Drive itself.
function pictureHtml(r) {
  const id = driveId(r.picture);
  if (!id) return `<div class="cm-pic cm-initials" aria-hidden="true">${esc(initials(r.name))}</div>`;
  return `<img class="cm-pic" src="/community-pictures/${id}.jpg" alt="" loading="lazy" referrerpolicy="no-referrer" ` +
    `onerror="this.onerror=null;this.src='${driveImageUrl(id)}'">`;
}

function itemHtml(r) {
  const line = [];
  if (r.type === 'person') line.push(r.affiliation);
  if (r.type === 'organisation') line.push(r.orgType);
  if (r.type === 'project') line.push(r.organisations, r.period);
  line.push([r.city, r.country].filter(Boolean).join(', '));
  const facts = [];
  if (r.role) facts.push(r.role);
  if (r.instruments) facts.push(r.instruments);
  if (r.ages) facts.push(r.ages);
  const name = r.link
    ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.name)}</a>`
    : esc(r.name);
  return `<article class="cm-item">${pictureHtml(r)}<div>` +
    `<h3>${name}</h3>` +
    `<p class="cm-line">${esc(line.filter(Boolean).join(' · '))}</p>` +
    (facts.length ? `<p class="cm-facts">${esc(facts.join(' · '))}</p>` : '') +
    (r.note ? `<p class="cm-note">${esc(r.note)}</p>` : '') +
    (r.link ? `<a class="cm-link" href="${esc(r.link)}" target="_blank" rel="noopener">website →</a>` : '') +
    `</div></article>`;
}

// Group by name (A–Z), country, age group or instrument category, as on the publications page.
// An entry with several age groups or categories shows under each of them.
export function listHtml(recs, mode) {
  const sorted = [...recs].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  if (!sorted.length) return '<p class="cm-empty">Nothing here yet.</p>';
  if (mode === 'name') return `<div class="cm-grid">${sorted.map(itemHtml).join('')}</div>`;
  const buckets = new Map();
  for (const r of sorted) {
    const keys = mode === 'country' ? [r.country]
      : mode === 'ages' ? split(r.ages)
      : split(r.category);
    for (const k of keys.length && keys[0] ? keys : ['Not specified']) {
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(r);
    }
  }
  const order = (k) => (k === 'Not specified' ? '￿' : mode === 'ages' ? String(AGE_GROUPS.indexOf(k)).padStart(2, '0') : k.toLowerCase());
  return [...buckets.keys()].sort((a, b) => order(a).localeCompare(order(b))).map((k) =>
    `<h2 class="cm-group">${esc(k)} <span>${buckets.get(k).length}</span></h2>` +
    `<div class="cm-grid">${buckets.get(k).map(itemHtml).join('')}</div>`).join('');
}

export const haystack = (r) => Object.values(r).join(' ').toLowerCase();
