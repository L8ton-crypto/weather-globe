'use client';

import { useRef, useEffect } from 'react';
import { WeatherData, getWeatherInfo } from '@/lib/weather';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Thermometer, Droplets, Wind, Eye, Gauge, Sun,
  CloudRain, Cloud, ArrowUp, MapPin
} from 'lucide-react';

function WindArrow({ direction }: { direction: number }) {
  return (
    <ArrowUp
      className="w-4 h-4 text-cyan-400 inline-block"
      style={{ transform: `rotate(${direction}deg)` }}
    />
  );
}

function DayCard({ day, index }: { day: WeatherData['daily'][0]; index: number }) {
  const info = getWeatherInfo(day.weatherCode);
  const dayName = index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short' });
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700/30 last:border-0">
      <div className="w-14 text-sm text-gray-400">{dayName}</div>
      <div className="text-lg">{info.icon}</div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white font-medium">{Math.round(day.tempMax)}°</span>
        <span className="text-gray-500">{Math.round(day.tempMin)}°</span>
      </div>
      {day.precipSum > 0 && (
        <div className="flex items-center gap-1 text-xs text-blue-400">
          <Droplets className="w-3 h-3" />
          {day.precipSum.toFixed(1)}mm
        </div>
      )}
      {day.precipSum === 0 && <div className="w-16" />}
    </div>
  );
}

function HourRow({ hour }: { hour: WeatherData['hourly'][0] }) {
  const info = getWeatherInfo(hour.weatherCode);
  const time = new Date(hour.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className="flex items-center gap-3 py-1.5 min-w-max">
      <span className="text-xs text-gray-400 w-12">{time}</span>
      <span className="text-sm">{info.icon}</span>
      <span className="text-sm text-white">{Math.round(hour.temperature)}°</span>
      {hour.precipitation > 0 && (
        <span className="text-xs text-blue-400">{hour.precipitation.toFixed(1)}mm</span>
      )}
    </div>
  );
}

export default function WeatherPanel({
  weather,
  onClose,
  isLoading,
}: {
  weather: WeatherData | null;
  onClose: () => void;
  isLoading: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!weather && !isLoading) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Delay to avoid closing immediately from the map click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 300);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [weather, isLoading, onClose]);

  return (
    <AnimatePresence>
      {(weather || isLoading) && (
        <motion.div
          ref={panelRef}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="absolute top-0 right-0 h-full w-96 max-w-[90vw] bg-gray-900/95 backdrop-blur-md border-l border-gray-700/50 z-20 overflow-y-auto"
        >
          {isLoading && !weather && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Fetching weather...</span>
              </div>
            </div>
          )}
          
          {weather && (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <div>
                      {weather.locationName ? (
                        <h2 className="text-base font-bold text-white">{weather.locationName}</h2>
                      ) : (
                        <h2 className="text-sm font-mono text-white">
                          {weather.lat.toFixed(2)}°, {weather.lng.toFixed(2)}°
                        </h2>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Current conditions */}
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">
                    {getWeatherInfo(weather.current.weatherCode, weather.current.isDay).icon}
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-white">
                      {Math.round(weather.current.temperature)}°C
                    </div>
                    <div className="text-sm text-gray-400">
                      {getWeatherInfo(weather.current.weatherCode, weather.current.isDay).description}
                    </div>
                    <div className="text-xs text-gray-500">
                      Feels like {Math.round(weather.current.feelsLike)}°C
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-px bg-gray-700/30 border-b border-gray-700/50">
                <StatCell
                  icon={<Droplets className="w-4 h-4 text-blue-400" />}
                  label="Humidity"
                  value={`${weather.current.humidity}%`}
                />
                <StatCell
                  icon={<Wind className="w-4 h-4 text-cyan-400" />}
                  label="Wind"
                  value={
                    <span className="flex items-center gap-1">
                      {Math.round(weather.current.windSpeed)} km/h
                      <WindArrow direction={weather.current.windDirection} />
                    </span>
                  }
                />
                <StatCell
                  icon={<Eye className="w-4 h-4 text-gray-400" />}
                  label="Visibility"
                  value={`${(weather.current.visibility / 1000).toFixed(0)} km`}
                />
                <StatCell
                  icon={<Gauge className="w-4 h-4 text-purple-400" />}
                  label="Pressure"
                  value={`${Math.round(weather.current.pressure)} hPa`}
                />
                <StatCell
                  icon={<Cloud className="w-4 h-4 text-gray-400" />}
                  label="Cloud Cover"
                  value={`${weather.current.cloudCover}%`}
                />
                <StatCell
                  icon={<Sun className="w-4 h-4 text-yellow-400" />}
                  label="UV Index"
                  value={`${weather.current.uvIndex.toFixed(1)}`}
                />
                {weather.current.windGusts > 0 && (
                  <StatCell
                    icon={<Wind className="w-4 h-4 text-red-400" />}
                    label="Gusts"
                    value={`${Math.round(weather.current.windGusts)} km/h`}
                  />
                )}
                {weather.current.precipitation > 0 && (
                  <StatCell
                    icon={<CloudRain className="w-4 h-4 text-blue-400" />}
                    label="Precipitation"
                    value={`${weather.current.precipitation} mm`}
                  />
                )}
              </div>

              {/* Hourly scroll */}
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Next 24 Hours</h3>
                <div className="overflow-x-auto -mx-1 px-1">
                  <div className="flex gap-4">
                    {weather.hourly.map((h, i) => (
                      <HourRow key={i} hour={h} />
                    ))}
                  </div>
                </div>
              </div>

              {/* 7-day forecast */}
              <div className="p-4">
                <h3 className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">7-Day Forecast</h3>
                {weather.daily.map((d, i) => (
                  <DayCard key={d.date} day={d} index={i} />
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-gray-900/80 p-3 flex items-center gap-2.5">
      {icon}
      <div>
        <div className="text-[10px] text-gray-500 uppercase">{label}</div>
        <div className="text-sm text-white">{value}</div>
      </div>
    </div>
  );
}
