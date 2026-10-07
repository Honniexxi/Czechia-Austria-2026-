import { FIXTURE_DATA } from './fixture.js';
import { storage } from './storage.js';

export const API_URL = 'https://script.google.com/macros/s/AKfycbwFgG0mslu13NrEjmfYosqM7F1NgHbhDmy1wWf9dasYHQNfLXeFpl5HvVHFQSeSomXkZA/exec';
const TRIP_CACHE_KEY = 'trip-data';
const TRIP_UPDATED_KEY = 'trip-updated-at';

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const isSafeUrl = value => !value || /^https?:\/\//i.test(value);
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const validTime = value => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function normalizeDate(value) {
  const match = String(value || '').match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!match) return '';
  const normalized = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return validDate(normalized) ? normalized : '';
}

function normalizeTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const normalized = `${match[1].padStart(2, '0')}:${match[2]}`;
  return validTime(normalized) ? normalized : '';
}

function normalizeLink(value) {
  const link = String(value || '').trim();
  return isSafeUrl(link) ? link : '';
}

function normalizeConfig(config) {
  const aliases = { 'Trip Name': 'TripName', 'Start Date': 'StartDate', 'End Date': 'EndDate' };
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [aliases[key] || key, ['StartDate', 'EndDate'].includes(aliases[key] || key) ? normalizeDate(value) : value]));
}

export function validatePayload(payload) {
  if (!isObject(payload) || payload.ok !== true || !isObject(payload.config)) throw new Error('INVALID_ROOT');
  for (const key of ['trip', 'itinerary', 'bookings', 'checklist']) {
    if (!Array.isArray(payload[key])) throw new Error(`INVALID_${key.toUpperCase()}`);
  }
  const trip = payload.trip.map(row => ({ ...row, Day: Number(row.Day), Date: normalizeDate(row.Date) })).filter(row => Number.isInteger(row.Day) && row.Day > 0 && validDate(row.Date));
  const itinerary = payload.itinerary.map(row => ({ ...row, Day: Number(row.Day), Date: normalizeDate(row.Date), Time: normalizeTime(row.Time), EndTime: normalizeTime(row.EndTime), Link: normalizeLink(row.Link) })).filter(row => Number.isInteger(row.Day) && row.Day > 0 && validDate(row.Date));
  const bookings = payload.bookings.map(row => ({ ...row, Date: normalizeDate(row.Date), Time: normalizeTime(row.Time), Link: normalizeLink(row.Link) })).filter(row => validDate(row.Date));
  const checklist = payload.checklist.filter(row => String(row.Category || '').trim() && String(row.Item || '').trim());
  return { ...payload, config: normalizeConfig(payload.config), trip, itinerary, bookings, checklist };
}

function apiConfigured() {
  return API_URL && !API_URL.includes('YOUR_GOOGLE_APPS_SCRIPT');
}

export function getCachedTrip() {
  const cached = storage.get(TRIP_CACHE_KEY);
  if (!cached) return null;
  try { return { data: validatePayload(cached), updatedAt: storage.get(TRIP_UPDATED_KEY) }; } catch { return null; }
}

export async function loadTrip({ force = false } = {}) {
  const cached = getCachedTrip();
  if (!apiConfigured()) {
    const data = validatePayload(FIXTURE_DATA);
    storage.set(TRIP_CACHE_KEY, data);
    storage.set(TRIP_UPDATED_KEY, FIXTURE_DATA.generatedAt);
    return { data, source: 'fixture', updatedAt: FIXTURE_DATA.generatedAt };
  }
  if (!force && cached) return { ...cached, source: 'cache', refreshAvailable: true };
  try {
    const separator = API_URL.includes('?') ? '&' : '?';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${API_URL}${separator}t=${Date.now()}`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const data = validatePayload(await response.json());
    const updatedAt = data.generatedAt || new Date().toISOString();
    storage.set(TRIP_CACHE_KEY, data);
    storage.set(TRIP_UPDATED_KEY, updatedAt);
    return { data, source: 'network', updatedAt };
  } catch (error) {
    if (cached) return { ...cached, source: 'stale-cache', error };
    throw error;
  }
}
