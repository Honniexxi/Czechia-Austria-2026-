import { FIXTURE_DATA } from './fixture.js';
import { storage } from './storage.js';

export const API_URL = 'https://script.google.com/macros/s/AKfycbwFgG0mslu13NrEjmfYosqM7F1NgHbhDmy1wWf9dasYHQNfLXeFpl5HvVHFQSeSomXkZA/exec';
const TRIP_CACHE_KEY = 'trip-data';
const TRIP_UPDATED_KEY = 'trip-updated-at';

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const isSafeUrl = value => !value || /^https?:\/\//i.test(value);
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const validTime = value => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function validatePayload(payload) {
  if (!isObject(payload) || payload.ok !== true || !isObject(payload.config)) throw new Error('INVALID_ROOT');
  for (const key of ['trip', 'itinerary', 'bookings', 'checklist']) {
    if (!Array.isArray(payload[key])) throw new Error(`INVALID_${key.toUpperCase()}`);
  }
  const trip = payload.trip.filter(row => Number.isInteger(Number(row.Day)) && Number(row.Day) > 0 && validDate(String(row.Date || '')));
  const itinerary = payload.itinerary.filter(row => Number.isInteger(Number(row.Day)) && Number(row.Day) > 0 && validDate(String(row.Date || '')) && validTime(String(row.Time || '')) && validTime(String(row.EndTime || '')) && isSafeUrl(String(row.Link || '')));
  const bookings = payload.bookings.filter(row => validDate(String(row.Date || '')) && validTime(String(row.Time || '')) && isSafeUrl(String(row.Link || '')));
  const checklist = payload.checklist.filter(row => String(row.Category || '').trim() && String(row.Item || '').trim());
  return { ...payload, trip, itinerary, bookings, checklist };
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
    const response = await fetch(`${API_URL}${separator}t=${Date.now()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
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
