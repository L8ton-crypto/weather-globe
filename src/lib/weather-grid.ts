// Fetch a sparse global grid of current weather conditions for animation effects
export interface WeatherGridCell {
  lat: number;
  lng: number;
  weatherCode: number;
  precipitation: number;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
}

export async function fetchWeatherGrid(): Promise<WeatherGridCell[]> {
  const cells: WeatherGridCell[] = [];
  const promises: Promise<void>[] = [];
  
  // Build lat/lng pairs for batch - every 8 degrees for decent coverage
  const lats: number[] = [];
  const lngs: number[] = [];
  
  for (let lat = -72; lat <= 72; lat += 8) {
    for (let lng = -176; lng < 180; lng += 8) {
      lats.push(lat);
      lngs.push(lng);
    }
  }
  
  // Open-Meteo supports multi-location in one request (up to ~50 at a time)
  const batchSize = 40;
  
  for (let i = 0; i < lats.length; i += batchSize) {
    const batchLats = lats.slice(i, i + batchSize);
    const batchLngs = lngs.slice(i, i + batchSize);
    
    promises.push(
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${batchLats.join(',')}&longitude=${batchLngs.join(',')}&current=weather_code,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m`
      ).then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        
        // Multi-location returns an array
        if (Array.isArray(data)) {
          data.forEach((d: { latitude: number; longitude: number; current?: { weather_code: number; precipitation: number; cloud_cover: number; wind_speed_10m: number; wind_direction_10m: number } }) => {
            if (d.current) {
              cells.push({
                lat: d.latitude,
                lng: d.longitude,
                weatherCode: d.current.weather_code,
                precipitation: d.current.precipitation,
                cloudCover: d.current.cloud_cover,
                windSpeed: d.current.wind_speed_10m,
                windDirection: d.current.wind_direction_10m,
              });
            }
          });
        } else if (data.current) {
          // Single location response
          cells.push({
            lat: data.latitude,
            lng: data.longitude,
            weatherCode: data.current.weather_code,
            precipitation: data.current.precipitation,
            cloudCover: data.current.cloud_cover,
            windSpeed: data.current.wind_speed_10m,
            windDirection: data.current.wind_direction_10m,
          });
        }
      }).catch(() => {})
    );
  }
  
  // Process batches with small delays to avoid rate limits
  for (let i = 0; i < promises.length; i += 5) {
    await Promise.all(promises.slice(i, i + 5));
    if (i + 5 < promises.length) {
      await new Promise(r => setTimeout(r, 150));
    }
  }
  
  return cells;
}

// Check if a weather code indicates thunderstorm
export function isThunderstorm(code: number): boolean {
  return code >= 95 && code <= 99;
}

// Check if weather code indicates rain/drizzle/snow
export function isPrecipitation(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 71 && code <= 86) || (code >= 80 && code <= 82);
}

// Get precipitation intensity (0-1) from weather code
export function getPrecipIntensity(code: number): number {
  // Light
  if ([51, 61, 71, 80, 85].includes(code)) return 0.3;
  // Moderate
  if ([53, 63, 73, 81].includes(code)) return 0.6;
  // Heavy
  if ([55, 57, 65, 66, 67, 75, 77, 82, 86].includes(code)) return 1.0;
  // Thunderstorm
  if (code >= 95) return 0.9;
  return 0;
}
