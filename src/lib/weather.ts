// Open-Meteo API - completely free, no key needed
export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  precipitation: number;
  cloudCover: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  weatherCode: number;
  isDay: boolean;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitation: number;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipSum: number;
  windMax: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
}

export interface WeatherData {
  lat: number;
  lng: number;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  timezone: string;
  locationName?: string;
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
      'precipitation', 'weather_code', 'cloud_cover', 'pressure_msl',
      'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
      'visibility', 'uv_index', 'is_day'
    ].join(','),
    hourly: [
      'temperature_2m', 'precipitation', 'cloud_cover',
      'wind_speed_10m', 'wind_direction_10m', 'weather_code'
    ].join(','),
    daily: [
      'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum',
      'wind_speed_10m_max', 'weather_code', 'sunrise', 'sunset', 'uv_index_max'
    ].join(','),
    timezone: 'auto',
    forecast_days: '7',
    forecast_hours: '24',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather API: ${res.status}`);
  
  const data = await res.json();
  
  return {
    lat,
    lng,
    timezone: data.timezone || 'UTC',
    current: {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      windGusts: data.current.wind_gusts_10m,
      precipitation: data.current.precipitation,
      cloudCover: data.current.cloud_cover,
      pressure: data.current.pressure_msl,
      visibility: data.current.visibility,
      uvIndex: data.current.uv_index,
      weatherCode: data.current.weather_code,
      isDay: !!data.current.is_day,
    },
    hourly: data.hourly.time.slice(0, 24).map((t: string, i: number) => ({
      time: t,
      temperature: data.hourly.temperature_2m[i],
      precipitation: data.hourly.precipitation[i],
      cloudCover: data.hourly.cloud_cover[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      windDirection: data.hourly.wind_direction_10m[i],
      weatherCode: data.hourly.weather_code[i],
    })),
    daily: data.daily.time.map((t: string, i: number) => ({
      date: t,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipSum: data.daily.precipitation_sum[i],
      windMax: data.daily.wind_speed_10m_max[i],
      weatherCode: data.daily.weather_code[i],
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      uvIndexMax: data.daily.uv_index_max[i],
    })),
  };
}

// Reverse geocode using Mapbox
export async function reverseGeocode(lat: number, lng: number, token: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,locality&limit=1`
    );
    if (!res.ok) return '';
    const data = await res.json();
    return data.features?.[0]?.place_name || '';
  } catch {
    return '';
  }
}

// WMO Weather codes to descriptions and icons
export function getWeatherInfo(code: number, isDay: boolean = true): { description: string; icon: string } {
  const map: Record<number, { description: string; dayIcon: string; nightIcon: string }> = {
    0: { description: 'Clear sky', dayIcon: '☀️', nightIcon: '🌙' },
    1: { description: 'Mainly clear', dayIcon: '🌤️', nightIcon: '🌙' },
    2: { description: 'Partly cloudy', dayIcon: '⛅', nightIcon: '☁️' },
    3: { description: 'Overcast', dayIcon: '☁️', nightIcon: '☁️' },
    45: { description: 'Fog', dayIcon: '🌫️', nightIcon: '🌫️' },
    48: { description: 'Depositing rime fog', dayIcon: '🌫️', nightIcon: '🌫️' },
    51: { description: 'Light drizzle', dayIcon: '🌦️', nightIcon: '🌧️' },
    53: { description: 'Moderate drizzle', dayIcon: '🌦️', nightIcon: '🌧️' },
    55: { description: 'Dense drizzle', dayIcon: '🌧️', nightIcon: '🌧️' },
    56: { description: 'Freezing drizzle', dayIcon: '🌧️', nightIcon: '🌧️' },
    57: { description: 'Dense freezing drizzle', dayIcon: '🌧️', nightIcon: '🌧️' },
    61: { description: 'Slight rain', dayIcon: '🌦️', nightIcon: '🌧️' },
    63: { description: 'Moderate rain', dayIcon: '🌧️', nightIcon: '🌧️' },
    65: { description: 'Heavy rain', dayIcon: '🌧️', nightIcon: '🌧️' },
    66: { description: 'Freezing rain', dayIcon: '🌧️', nightIcon: '🌧️' },
    67: { description: 'Heavy freezing rain', dayIcon: '🌧️', nightIcon: '🌧️' },
    71: { description: 'Slight snow', dayIcon: '🌨️', nightIcon: '🌨️' },
    73: { description: 'Moderate snow', dayIcon: '🌨️', nightIcon: '🌨️' },
    75: { description: 'Heavy snow', dayIcon: '🌨️', nightIcon: '🌨️' },
    77: { description: 'Snow grains', dayIcon: '🌨️', nightIcon: '🌨️' },
    80: { description: 'Slight rain showers', dayIcon: '🌦️', nightIcon: '🌧️' },
    81: { description: 'Moderate rain showers', dayIcon: '🌧️', nightIcon: '🌧️' },
    82: { description: 'Violent rain showers', dayIcon: '⛈️', nightIcon: '⛈️' },
    85: { description: 'Slight snow showers', dayIcon: '🌨️', nightIcon: '🌨️' },
    86: { description: 'Heavy snow showers', dayIcon: '🌨️', nightIcon: '🌨️' },
    95: { description: 'Thunderstorm', dayIcon: '⛈️', nightIcon: '⛈️' },
    96: { description: 'Thunderstorm with hail', dayIcon: '⛈️', nightIcon: '⛈️' },
    99: { description: 'Thunderstorm with heavy hail', dayIcon: '⛈️', nightIcon: '⛈️' },
  };
  
  const info = map[code] || { description: 'Unknown', dayIcon: '❓', nightIcon: '❓' };
  return {
    description: info.description,
    icon: isDay ? info.dayIcon : info.nightIcon,
  };
}

// Wind grid data for particle animation
export interface WindCell {
  lat: number;
  lng: number;
  u: number; // east-west component (m/s)
  v: number; // north-south component (m/s)
  speed: number;
}

export async function fetchWindGrid(): Promise<WindCell[]> {
  // Use Open-Meteo multi-location: batch all coords into a few requests
  const cells: WindCell[] = [];
  const allLats: number[] = [];
  const allLngs: number[] = [];
  
  // Sparse grid every 15 degrees = ~300 points total
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let lng = -180; lng < 180; lng += 15) {
      allLats.push(lat);
      allLngs.push(lng);
    }
  }
  
  // Open-Meteo allows ~50 locations per request
  const batchSize = 50;
  for (let i = 0; i < allLats.length; i += batchSize) {
    const batchLats = allLats.slice(i, i + batchSize);
    const batchLngs = allLngs.slice(i, i + batchSize);
    
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${batchLats.join(',')}&longitude=${batchLngs.join(',')}&current=wind_speed_10m,wind_direction_10m`
      );
      if (!res.ok) continue;
      const data = await res.json();
      
      const items = Array.isArray(data) ? data : [data];
      for (const d of items) {
        if (!d.current) continue;
        const speed = d.current.wind_speed_10m || 0;
        const dir = d.current.wind_direction_10m || 0;
        const dirRad = (dir * Math.PI) / 180;
        cells.push({
          lat: d.latitude,
          lng: d.longitude,
          u: -speed * Math.sin(dirRad),
          v: -speed * Math.cos(dirRad),
          speed,
        });
      }
    } catch {}
    
    // Small delay between batches
    if (i + batchSize < allLats.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  return cells;
}
