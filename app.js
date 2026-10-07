import { loadTrip } from './api.js';
import { storage } from './storage.js';
import { getWeather, refreshRates } from './data-services.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { data: null, selectedDay: null, route: 'today', tool: 'checklist', updatedAt: null, source: null };
const iconMap = { Flight: '✈', Transport: '↝', Train: '🚆', Bus: '🚌', Hotel: '⌂', Attraction: '⌖', Food: '♨', Cafe: '☕', Activity: '✦', Concert: '♫', Restaurant: '♨', Other: '•' };
const countryFlags = { CZ: '🇨🇿', AT: '🇦🇹' };
const localDate = value => new Date(`${value}T12:00:00`);
const formatDate = (value, options) => new Intl.DateTimeFormat('en-GB', options).format(localDate(value));
const formatTime = iso => iso ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '';
const text = value => String(value ?? '').trim();
const normalizeTitle = value => text(value).toLocaleLowerCase().replace(/\s+/g, ' ');

function element(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  }
  for (const child of Array.isArray(children) ? children : [children]) if (child) node.append(child);
  return node;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function safeLink(url, label, className = 'action-button') {
  if (!/^https?:\/\//i.test(text(url))) return null;
  return element('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: className, text: label });
}

function mapLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

async function copyAddress(address) {
  try {
    await navigator.clipboard.writeText(address);
    showToast('Address copied');
  } catch {
    window.prompt('Copy this address:', address);
  }
}

function getAvailableDays() {
  const days = [...state.data.trip.map(row => Number(row.Day)), ...state.data.itinerary.map(row => Number(row.Day))];
  return [...new Set(days.filter(Number.isInteger))].sort((a, b) => a - b);
}

function dayFromLocation() {
  const match = location.hash.match(/day=(\d+)/);
  const requested = match ? Number(match[1]) : null;
  const days = getAvailableDays();
  if (days.includes(requested)) return requested;
  const timezone = state.data.config.Timezone || 'Europe/Prague';
  let today;
  try { today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  catch { today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  const exact = state.data.trip.find(row => row.Date === today);
  if (exact) return Number(exact.Day);
  const dated = state.data.trip.slice().sort((a, b) => a.Date.localeCompare(b.Date));
  if (dated.length && today < dated[0].Date) return Number(dated[0].Day);
  if (dated.length && today > dated.at(-1).Date) return Number(dated.at(-1).Day);
  return days[0] ?? null;
}

function setDay(day, { updateHash = true } = {}) {
  if (!getAvailableDays().includes(Number(day))) return;
  state.selectedDay = Number(day);
  if (updateHash) history.replaceState(null, '', `#today/day=${day}`);
  renderToday();
}

function setRoute(route, { preserveHash = false } = {}) {
  const valid = ['today', 'journey', 'tools', 'info'];
  if (!valid.includes(route)) route = 'today';
  state.route = route;
  $$('.view').forEach(view => { const active = view.dataset.view === route; view.hidden = !active; view.classList.toggle('is-active', active); });
  $$('.bottom-nav button').forEach(button => { const active = button.dataset.route === route; button.classList.toggle('is-active', active); active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current'); });
  if (!preserveHash) history.replaceState(null, '', route === 'today' ? `#today/day=${state.selectedDay}` : `#${route}`);
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function routeFromHash() {
  const route = location.hash.replace('#', '').split('/')[0] || 'today';
  setRoute(route, { preserveHash: true });
  if (route === 'today') setDay(dayFromLocation(), { updateHash: false });
}

function matchingBooking(item) {
  const matches = state.data.bookings.filter(row => row.Date === item.Date && normalizeTitle(row.Title) === normalizeTitle(item.Title));
  return matches.length === 1 ? matches[0] : null;
}

function bookingLabel(type) {
  if (type === 'Hotel') return 'Open Booking';
  if (type === 'Restaurant') return 'Open Reservation';
  if (['Train', 'Bus', 'Attraction', 'Concert'].includes(type)) return 'Open Ticket';
  if (type === 'Flight') return 'Open Booking';
  return 'Open Link';
}

function renderDaySelector() {
  const container = $('#day-selector');
  container.replaceChildren();
  const tripByDay = new Map(state.data.trip.map(row => [Number(row.Day), row]));
  for (const day of getAvailableDays()) {
    const row = tripByDay.get(day) || state.data.itinerary.find(item => Number(item.Day) === day);
    const button = element('button', { type: 'button', class: 'day-pill', role: 'tab', 'aria-selected': day === state.selectedDay, 'aria-label': `Day ${day}, ${row?.Date || ''}` }, [
      element('span', { text: `D${day}` }), element('b', { text: row?.Date ? formatDate(row.Date, { day: '2-digit' }) : '—' })
    ]);
    button.addEventListener('click', () => setDay(day));
    container.append(button);
    if (day === state.selectedDay) requestAnimationFrame(() => button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }));
  }
}

function timelineCard(item, index) {
  const detailsId = `details-${state.selectedDay}-${index}`;
  const details = element('div', { class: 'timeline-details', id: detailsId, hidden: '' });
  if (item.EndTime) details.append(element('p', {}, [element('span', { class: 'detail-label', text: 'Until' }), document.createTextNode(item.EndTime)]));
  if (item.Address) details.append(element('p', {}, [element('span', { class: 'detail-label', text: 'Address' }), document.createTextNode(item.Address)]));
  if (item.Note) details.append(element('p', {}, [element('span', { class: 'detail-label', text: 'Note' }), document.createTextNode(item.Note)]));
  const actions = element('div', { class: 'action-row' });
  if (item.Address) {
    actions.append(safeLink(mapLink(item.Address), 'Navigate'));
    actions.append(element('button', { type: 'button', class: 'action-button', text: 'Copy Address', onClick: () => copyAddress(item.Address) }));
  }
  const website = safeLink(item.Link, 'Website'); if (website) actions.append(website);
  const booking = matchingBooking(item); const ticket = booking ? safeLink(booking.Link, bookingLabel(booking.Type)) : null; if (ticket) actions.append(ticket);
  if (actions.childElementCount) details.append(actions);
  const toggle = element('button', { type: 'button', class: 'timeline-toggle', 'aria-expanded': 'false', 'aria-controls': detailsId }, [
    element('span', { class: 'type-icon', text: iconMap[item.Type] || iconMap.Other, 'aria-hidden': 'true' }),
    element('span', {}, [element('strong', { text: item.Title || 'Untitled' }), item.Subtitle ? element('small', { text: item.Subtitle }) : null]),
    element('span', { class: 'chevron', text: '⌄', 'aria-hidden': 'true' })
  ]);
  toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!open)); details.hidden = open; });
  return element('article', { class: 'timeline-item' }, [element('time', { class: 'timeline-time', text: item.Time || 'Anytime' }), element('span', { class: 'timeline-dot', 'aria-hidden': 'true' }), element('div', { class: 'timeline-card' }, [toggle, details])]);
}

function renderToday() {
  const trip = state.data.trip.find(row => Number(row.Day) === state.selectedDay);
  const fallbackItem = state.data.itinerary.find(row => Number(row.Day) === state.selectedDay);
  const date = trip?.Date || fallbackItem?.Date;
  $('#trip-name').textContent = state.data.config.TripName || 'Europe 2026';
  $('#day-number').textContent = `DAY ${state.selectedDay ?? '—'}`;
  $('#today-date').textContent = date ? formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Date unavailable';
  $('#today-place').textContent = trip ? `${trip.City} · ${trip.Country}` : 'Journey day';
  $('#day-summary').textContent = trip?.Summary || '';
  renderDaySelector();
  const items = state.data.itinerary.map((row, index) => ({ ...row, _index: index })).filter(row => Number(row.Day) === state.selectedDay).sort((a, b) => {
    if (!a.Time && !b.Time) return a._index - b._index;
    if (!a.Time) return 1; if (!b.Time) return -1;
    return a.Time.localeCompare(b.Time) || a._index - b._index;
  });
  const timeline = $('#timeline'); timeline.replaceChildren();
  if (!items.length) timeline.append(element('div', { class: 'empty-state', text: 'No itinerary items for this day.' }));
  else items.forEach((item, index) => timeline.append(timelineCard(item, index)));
  renderWeather(date, trip);
}

async function renderWeather(date, trip) {
  $('#weather-temp').textContent = 'Forecast unavailable';
  const tooFar = date && Math.abs((localDate(date) - new Date()) / 86400000) > 14;
  $('#weather-copy').textContent = tooFar ? '尚未進入可預報日期' : '目前沒有可用的天氣資料';
  $('#weather-updated').textContent = 'No cached forecast';
  $('.weather-icon').textContent = '☁';
  if (!date || !trip?.City || !trip?.CountryCode) return;
  const weather = await getWeather({ city: trip.City, countryCode: trip.CountryCode, date, timezone: state.data.config.Timezone });
  if (!weather || state.selectedDay !== Number(trip.Day)) return;
  $('#weather-temp').textContent = `${weather.max}° / ${weather.min}°`;
  $('#weather-copy').textContent = weather.summary;
  $('#weather-updated').textContent = `${weather.stale ? 'Cached' : 'Updated'} ${formatTime(weather.updatedAt)}`;
  $('.weather-icon').textContent = weather.icon;
}

function renderJourney() {
  const trip = state.data.trip.slice().sort((a, b) => Number(a.Day) - Number(b.Day));
  if (!trip.length) return;
  $('#journey-range').textContent = `${formatDate(trip[0].Date, { day: '2-digit', month: 'long' })} — ${formatDate(trip.at(-1).Date, { day: '2-digit', month: 'long', year: 'numeric' })}`;
  const countries = new Set(trip.map(row => row.CountryCode)); const cities = new Set(trip.map(row => row.City));
  $('#journey-stats').replaceChildren(element('span', { text: `${trip.length} DAYS` }), element('span', { text: `${countries.size} COUNTRIES` }), element('span', { text: `${cities.size} CITIES` }));
  const list = $('#journey-list'); list.replaceChildren();
  const groups = new Map();
  for (const row of trip) { const key = `${row.CountryCode}|${row.Country}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); }
  for (const [key, rows] of groups) {
    const [code, country] = key.split('|');
    const block = element('section', { class: 'country-block' }, [element('div', { class: 'country-title' }, [element('span', { text: countryFlags[code] || '◉' }), element('h2', { text: country })])]);
    rows.forEach(row => block.append(element('button', { type: 'button', class: 'journey-day', onClick: () => { setDay(Number(row.Day)); setRoute('today'); } }, [
      element('span', { class: 'journey-date', text: `${formatDate(row.Date, { month: 'short' }).toUpperCase()}\n${formatDate(row.Date, { day: '2-digit' })}` }),
      element('span', {}, [element('strong', { text: `Day ${row.Day} · ${row.City}` }), element('p', { text: row.Summary || row.Note || 'Journey day' })]), element('span', { class: 'journey-arrow', text: '→', 'aria-hidden': 'true' })
    ])));
    list.append(block);
  }
}

function checklistKey(row) { return `${row.Category}::${row.Item}`; }
function renderChecklist() {
  const panel = $('#tool-checklist'); panel.replaceChildren();
  const done = storage.get('checklist', {}); const validKeys = new Set(state.data.checklist.map(checklistKey));
  for (const key of Object.keys(done)) if (!validKeys.has(key)) delete done[key]; storage.set('checklist', done);
  const count = state.data.checklist.filter(row => done[checklistKey(row)]).length;
  const heading = element('div', { class: 'journal-card' }, [element('div', { class: 'card-heading' }, [element('div', {}, [element('p', { class: 'eyebrow', text: 'READY TO GO' }), element('h2', { text: 'Checklist' })]), element('span', { text: `${count} / ${state.data.checklist.length}` })]), element('div', { class: 'check-progress' }, [element('i', { style: `width:${state.data.checklist.length ? count / state.data.checklist.length * 100 : 0}%` })])]); panel.append(heading);
  const groups = new Map(); for (const row of state.data.checklist) { if (!groups.has(row.Category)) groups.set(row.Category, []); groups.get(row.Category).push(row); }
  for (const [category, rows] of groups) {
    const card = element('section', { class: 'journal-card' }, [element('h3', { text: category })]);
    rows.forEach(row => { const key = checklistKey(row); const checkbox = element('input', { type: 'checkbox', checked: done[key] ? '' : null, 'aria-label': row.Item }); checkbox.checked = Boolean(done[key]); checkbox.addEventListener('change', () => { done[key] = checkbox.checked; storage.set('checklist', done); renderChecklist(); }); card.append(element('label', { class: 'check-item' }, [checkbox, element('span', {}, [element('strong', { text: row.Item }), row.Note ? element('small', { text: row.Note }) : null])])) }); panel.append(card);
  }
}

function renderBookingCard(row) {
  const actions = element('div', { class: 'action-row' }); const link = safeLink(row.Link, bookingLabel(row.Type)); if (link) actions.append(link); if (row.Address) actions.append(safeLink(mapLink(row.Address), 'Navigate'));
  return element('article', { class: 'journal-card booking-card' }, [element('span', { class: 'type-icon', text: iconMap[row.Type] || iconMap.Other, 'aria-hidden': 'true' }), element('div', { class: 'booking-meta', text: `${formatDate(row.Date, { month: 'short', day: '2-digit' }).toUpperCase()}${row.Time ? ` · ${row.Time}` : ''}` }), element('h3', { text: row.Title }), row.BookingInfo ? element('p', { text: row.BookingInfo }) : null, row.Note ? element('p', { class: 'quiet-note', text: row.Note }) : null, actions.childElementCount ? actions : null]);
}

function renderBookings() {
  const panel = $('#tool-bookings'); panel.replaceChildren();
  const rows = state.data.bookings.slice().sort((a, b) => a.Date.localeCompare(b.Date) || (!a.Time ? 1 : !b.Time ? -1 : a.Time.localeCompare(b.Time)));
  if (!rows.length) panel.append(element('div', { class: 'empty-state', text: 'No bookings yet.' })); else rows.forEach(row => panel.append(renderBookingCard(row)));
}

function renderNotes() {
  const list = $('#notes-list'); list.replaceChildren(); const notes = storage.get('quick-notes', []);
  if (!notes.length) { list.append(element('div', { class: 'empty-state', text: '旅途中臨時想到的事，可以記在這裡。' })); return; }
  notes.forEach(note => { const check = element('input', { type: 'checkbox', 'aria-label': `完成：${note.text}` }); check.checked = note.done; check.addEventListener('change', () => { note.done = check.checked; storage.set('quick-notes', notes); renderNotes(); }); const remove = element('button', { type: 'button', text: '×', 'aria-label': `刪除：${note.text}` }); remove.addEventListener('click', () => { storage.set('quick-notes', notes.filter(item => item.id !== note.id)); renderNotes(); }); list.append(element('article', { class: `note-card${note.done ? ' is-done' : ''}` }, [check, element('p', { text: note.text }), remove])); });
}

function renderInfo() {
  const container = $('#info-content'); container.replaceChildren();
  const sections = [
    ['Stays', state.data.bookings.filter(row => row.Type === 'Hotel')],
    ['Reserved Transport', state.data.bookings.filter(row => ['Flight', 'Train', 'Bus'].includes(row.Type))]
  ];
  for (const [title, rows] of sections) { const section = element('section', { class: 'info-section' }, [element('h2', { text: title })]); if (rows.length) rows.forEach(row => section.append(renderBookingCard(row))); else section.append(element('p', { class: 'empty-copy', text: 'No saved information.' })); container.append(section); }
  const fixed = Object.entries(state.data.config).filter(([key, value]) => value && (key.startsWith('Emergency') || key === 'TravelNotes'));
  const fixedSection = element('section', { class: 'info-section' }, [element('h2', { text: 'Emergency & Travel Notes' })]);
  if (!fixed.length) fixedSection.append(element('p', { class: 'empty-copy', text: 'No fixed information in Config.' }));
  else fixedSection.append(element('div', { class: 'journal-card config-list' }, fixed.map(([key, value]) => element('div', { class: 'config-row' }, [element('b', { text: key.replace(/([A-Z])/g, ' $1').trim() }), element('span', { text: value })])))); container.append(fixedSection);
}

function renderAll() { renderToday(); renderJourney(); renderChecklist(); renderBookings(); renderNotes(); renderInfo(); }

function setSyncStatus(source, updatedAt, error = false) {
  const button = $('#sync-button'); button.classList.toggle('is-offline', source === 'stale-cache' || !navigator.onLine); button.classList.toggle('is-error', error);
  const prefix = source === 'fixture' ? 'Preview data' : source === 'stale-cache' || !navigator.onLine ? 'Offline' : 'Online';
  $('#sync-label').textContent = updatedAt ? `${prefix} · ${formatTime(updatedAt)}` : prefix;
}

async function initialize({ force = false } = {}) {
  $('#fatal-state').hidden = true; $$('.view').forEach(view => view.hidden = true); $('#sync-label').textContent = 'Syncing';
  try {
    const result = await loadTrip({ force }); state.data = result.data; state.updatedAt = result.updatedAt; state.source = result.source; state.selectedDay = dayFromLocation(); renderAll(); routeFromHash(); setSyncStatus(result.source, result.updatedAt, Boolean(result.error));
    refreshRates().then(() => renderCurrency()).catch(() => renderCurrency());
    if (result.error) showToast('Using the last valid journey data');
  } catch {
    setSyncStatus('error', null, true); $('#fatal-state').hidden = false; $('#fatal-message').textContent = navigator.onLine ? '資料格式不正確或暫時無法讀取，請稍後重試。' : '首次載入需要網路連線。';
  }
}

function bindEvents() {
  $$('.bottom-nav button').forEach(button => button.addEventListener('click', () => setRoute(button.dataset.route)));
  $$('.tool-tabs button').forEach(button => button.addEventListener('click', () => { state.tool = button.dataset.tool; $$('.tool-tabs button').forEach(item => item.setAttribute('aria-selected', String(item === button))); $$('.tool-panel').forEach(panel => { const active = panel.dataset.toolPanel === state.tool; panel.hidden = !active; panel.classList.toggle('is-active', active); }); }));
  $('#note-form').addEventListener('submit', event => { event.preventDefault(); const input = $('#note-input'); const value = input.value.trim(); if (!value) return; const notes = storage.get('quick-notes', []); notes.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text: value, done: false }); storage.set('quick-notes', notes); input.value = ''; renderNotes(); });
  $('#currency-swap').addEventListener('click', () => { const from = $('#currency-from'); const to = $('#currency-to'); [from.value, to.value] = [to.value, from.value]; renderCurrency(); });
  ['currency-amount', 'currency-from', 'currency-to'].forEach(id => $(`#${id}`).addEventListener('input', renderCurrency));
  $('#sync-button').addEventListener('click', () => initialize({ force: true })); $('#retry-button').addEventListener('click', () => initialize({ force: true }));
  window.addEventListener('hashchange', () => state.data && routeFromHash()); window.addEventListener('online', () => initialize({ force: true })); window.addEventListener('offline', () => setSyncStatus('stale-cache', state.updatedAt));
}

function renderCurrency() {
  const rates = storage.get('exchange-rates'); const output = $('#currency-result');
  if (!rates?.values || !rates.updatedAt) { $('#rate-status').textContent = 'Unavailable'; output.textContent = 'Waiting for rates'; return; }
  const raw = $('#currency-amount').value.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(raw)) { output.textContent = 'Enter a valid amount'; return; }
  const minor = BigInt(Math.round(Number(raw) * 100)); const from = $('#currency-from').value; const to = $('#currency-to').value;
  const fromRate = BigInt(rates.values[from]); const toRate = BigInt(rates.values[to]); const scaled = minor * toRate / fromRate;
  output.textContent = `${(Number(scaled) / 100).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${to}`;
  $('#rate-status').textContent = `Last updated ${formatTime(rates.updatedAt)}`;
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); } catch { /* PWA 仍可在線使用 */ }
  }
}

bindEvents();
initialize();
renderCurrency();
registerServiceWorker();
