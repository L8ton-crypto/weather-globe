'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import mapboxgl from 'mapbox-gl';
import { WeatherData, fetchWeather, reverseGeocode, fetchWindGrid, WindCell } from '@/lib/weather';
import { WeatherGridCell, fetchWeatherGrid } from '@/lib/weather-grid';
import WeatherPanel from '@/components/WeatherPanel';
import WeatherEffects from '@/components/WeatherEffects';
import Controls from '@/components/Controls';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe as GlobeIcon, Loader2 } from 'lucide-react';

const Globe = dynamic(() => import('@/components/Globe'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <span className="text-gray-400 text-sm">Loading globe...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'wind' | 'temp' | 'precip' | 'clouds'>('wind');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [windData, setWindData] = useState<WindCell[]>([]);
  const [windLoading, setWindLoading] = useState(false);
  const [weatherGrid, setWeatherGrid] = useState<WeatherGridCell[]>([]);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  // Load wind data and weather grid on mount
  useEffect(() => {
    setWindLoading(true);
    fetchWindGrid()
      .then(setWindData)
      .catch(console.error)
      .finally(() => setWindLoading(false));
    
    // Load weather grid for effects (rain, clouds, lightning)
    fetchWeatherGrid()
      .then(setWeatherGrid)
      .catch(console.error);
  }, []);

  // Splash screen
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleLocationClick = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const data = await fetchWeather(lat, lng);
      
      // Reverse geocode for location name
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (token) {
        data.locationName = await reverseGeocode(lat, lng, token);
      }
      
      setWeather(data);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setWeather(null); // Clear on error so spinner stops
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLocate = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          handleLocationClick(loc.lat, loc.lng);
        },
        err => console.error('Geolocation error:', err)
      );
    }
  }, [handleLocationClick]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-950 relative">
      {/* Splash screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative">
                <GlobeIcon className="w-16 h-16 text-indigo-400" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0"
                >
                  <div className="absolute -top-1 left-1/2 w-2 h-2 bg-cyan-400 rounded-full" />
                </motion.div>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Weather<span className="text-indigo-400">Globe</span>
              </h1>
              <p className="text-gray-400 text-sm">Live global weather visualisation</p>
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-gray-500 text-xs">Loading wind patterns...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title bar */}
      <div className="absolute top-4 left-4 z-10">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-700/50 px-4 py-2.5"
        >
          <GlobeIcon className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              Weather<span className="text-indigo-400">Globe</span>
            </h1>
            <p className="text-[10px] text-gray-500">Live Global Weather</p>
          </div>
        </motion.div>
      </div>

      {/* Globe */}
      <Globe
        onLocationClick={handleLocationClick}
        windData={windData}
        activeLayer={activeLayer}
        userLocation={userLocation}
        onMapReady={setMapInstance}
      />

      {/* Weather effects overlay (rain, clouds, lightning) */}
      <WeatherEffects
        map={mapInstance}
        grid={weatherGrid}
        enabled={effectsEnabled}
      />

      {/* Weather panel */}
      <WeatherPanel
        weather={weather}
        onClose={() => setWeather(null)}
        isLoading={isLoading}
      />

      {/* Controls */}
      <Controls
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
        onLocate={handleLocate}
        windLoading={windLoading}
        effectsEnabled={effectsEnabled}
        onToggleEffects={() => setEffectsEnabled(e => !e)}
      />
    </div>
  );
}
