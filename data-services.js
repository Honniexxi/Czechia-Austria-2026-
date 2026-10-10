import { storage } from './storage.js';

const RATE_KEY = 'exchange-rates';
const WEATHER_PREFIX = 'weather:';
const SCALE = 100000000;

export async function refreshRates() {
  try {
    const response = await fetch('https://api.frankfurter.dev/v2/rates?base=EUR&quotes=CZK,TWD', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const rows = await response.json();
    const values = { EUR: SCALE };
    for (const row of rows) if (['CZK', 'TWD'].includes(row.quote) && Number.isFinite(row.rate)) values[row.quote] = Math.round(row.rate * SCALE);
    if (!values.CZK || !values.TWD) throw new Error('MISSING_RATE');
    const result = { values, updatedAt: new Date().toISOString(), rateDate: rows[0]?.date || '' };
    storage.set(RATE_KEY, result);
    return result;
  } catch (error) {
    const cached = storage.get(RATE_KEY);
    if (cached?.values) return { ...cached, stale: true, error };
    throw error;
  }
}

const weatherCode = code => {
  if (code === 0) return ['Clear sky', '☀'];
  if ([1, 2].includes(code)) return ['Partly cloudy', '⛅'];
  if (code === 3) return ['Overcast', '☁'];
  if ([45, 48].includes(code)) return ['Foggy', '≋'];
  if ([51, 53, 55, 56, 57].includes(code)) return ['Drizzle', '☂'];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['Rain', '☂'];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Snow', '❄'];
  if ([95, 96, 99].includes(code)) return ['Thunderstorm', 'ϟ'];
  return ['Weather update', '☁'];
};

export async function getWeather({ city, countryCode, date, timezone }) {
  const key = `${WEATHER_PREFIX}${countryCode}:${city}:${date}`;
  const cached = storage.get(key);
  const diff = Math.floor((new Date(`${date}T12:00:00`) - new Date()) / 86400000);
  if (diff < -1 || diff > 15) return cached ? { ...cached, stale: true } : null;
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&countryCode=${encodeURIComponent(countryCode)}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geoUrl); if (!geoResponse.ok) throw new Error('GEO_FAILED');
    const place = (await geoResponse.json()).results?.[0]; if (!place) throw new Error('CITY_NOT_FOUND');
    const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,wind_speed_10m_max', timezone: timezone || place.timezone || 'auto', forecast_days: '16' });
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`); if (!weatherResponse.ok) throw new Error('WEATHER_FAILED');
    const payload = await weatherResponse.json(); const index = payload.daily?.time?.indexOf(date); if (index < 0) return cached ? { ...cached, stale: true } : null;
    const [summary, icon] = weatherCode(payload.daily.weather_code[index]);
    const result = {
      date, city,
      max: Math.round(payload.daily.temperature_2m_max[index]),
      min: Math.round(payload.daily.temperature_2m_min[index]),
      apparentMax: Math.round(payload.daily.apparent_temperature_max[index]),
      apparentMin: Math.round(payload.daily.apparent_temperature_min[index]),
      precipitation: Math.round(payload.daily.precipitation_probability_max[index] || 0),
      wind: Math.round(payload.daily.wind_speed_10m_max[index] || 0),
      summary, icon, updatedAt: new Date().toISOString()
    };
    storage.set(key, result); return result;
  } catch (error) {
    if (cached) return { ...cached, stale: true, error };
    return null;
  }
}
