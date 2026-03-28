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
  
  // Sparse grid every 15 degrees - ~300 points, fits in ~6 batch requests
  const allLats: number[] = [];
  const allLngs: number[] = [];
  
  for (let lat = -70; lat <= 70; lat += 15) {
    for (let lng = -180; lng < 180; lng += 15) {
      allLats.push(lat);
      allLngs.push(lng);
    }
  }
  
  const batchSize = 50;
  
  for (let i = 0; i < allLats.length; i += batchSize) {
    const batchLats = allLats.slice(i, i + batchSize);
    const batchLngs = allLngs.slice(i, i + batchSize);
    
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${batchLats.join(',')}&longitude=${batchLngs.join(',')}&current=weather_code,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m`
      );
      if (!res.ok) continue;
      const data = await res.json();
      
      const items = Array.isArray(data) ? data : [data];
      for (const d of items) {
        if (!d.current) continue;
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
    } catch {}
    
    if (i + batchSize < allLats.length) {
      await new Promise(r => setTimeout(r, 300));
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
