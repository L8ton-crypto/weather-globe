'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { WindCell } from '@/lib/weather';

interface GlobeProps {
  onLocationClick: (lat: number, lng: number) => void;
  windData: WindCell[];
  activeLayer: 'wind' | 'temp' | 'precip' | 'clouds';
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (map: mapboxgl.Map) => void;
}

export default function Globe({ onLocationClick, windData, activeLayer, userLocation, onMapReady }: GlobeProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const animationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 30],
      zoom: 2.2,
      projection: 'globe',
      attributionControl: false,
    });

    m.on('style.load', () => {
      m.setFog({
        color: 'rgb(8, 10, 22)',
        'high-color': 'rgb(16, 20, 50)',
        'horizon-blend': 0.06,
        'space-color': 'rgb(4, 4, 12)',
        'star-intensity': 0.8,
      });
    });

    m.on('load', () => {
      setMapReady(true);
      if (onMapReady) onMapReady(m);
      
      // Add weather tile layers (OpenWeatherMap free tile layer)
      // Temperature overlay
      m.addSource('temp-tiles', {
        type: 'raster',
        tiles: [
          'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2'
        ],
        tileSize: 256,
      });
      m.addLayer({
        id: 'temperature-layer',
        type: 'raster',
        source: 'temp-tiles',
        paint: { 'raster-opacity': 0 },
      });
      
      // Precipitation overlay
      m.addSource('precip-tiles', {
        type: 'raster',
        tiles: [
          'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2'
        ],
        tileSize: 256,
      });
      m.addLayer({
        id: 'precipitation-layer',
        type: 'raster',
        source: 'precip-tiles',
        paint: { 'raster-opacity': 0 },
      });
      
      // Cloud overlay
      m.addSource('cloud-tiles', {
        type: 'raster',
        tiles: [
          'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2'
        ],
        tileSize: 256,
      });
      m.addLayer({
        id: 'clouds-layer',
        type: 'raster',
        source: 'cloud-tiles',
        paint: { 'raster-opacity': 0 },
      });
    });

    // Click to get weather
    m.on('click', (e) => {
      const { lat, lng } = e.lngLat;
      onLocationClick(lat, lng);
      
      // Drop a marker
      if (marker.current) marker.current.remove();
      
      const el = document.createElement('div');
      el.className = 'weather-marker';
      el.innerHTML = `<div style="width:20px;height:20px;background:rgba(99,102,241,0.8);border:2px solid white;border-radius:50%;box-shadow:0 0 12px rgba(99,102,241,0.6);cursor:pointer;"></div>`;
      
      marker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(m);
    });

    map.current = m;

    return () => {
      cancelAnimationFrame(animationRef.current);
      m.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Layer visibility
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;
    
    const layers = {
      'temperature-layer': activeLayer === 'temp' ? 0.6 : 0,
      'precipitation-layer': activeLayer === 'precip' ? 0.7 : 0,
      'clouds-layer': activeLayer === 'clouds' ? 0.5 : 0,
    };
    
    Object.entries(layers).forEach(([id, opacity]) => {
      if (m.getLayer(id)) {
        m.setPaintProperty(id, 'raster-opacity', opacity);
      }
    });
  }, [activeLayer, mapReady]);

  // User location marker
  useEffect(() => {
    if (!map.current || !userLocation) return;
    
    if (userMarker.current) userMarker.current.remove();
    
    const el = document.createElement('div');
    el.innerHTML = `<div style="width:16px;height:16px;background:rgba(239,68,68,0.9);border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(239,68,68,0.5);"></div>`;
    
    userMarker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);
  }, [userLocation]);

  // Wind particle animation overlay
  useEffect(() => {
    if (!map.current || !mapReady || windData.length === 0) return;
    
    const m = map.current;
    const container = m.getContainer();
    
    // Create overlay canvas for particles
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '5';
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    const NUM_PARTICLES = 3000;
    particlesRef.current = Array.from({ length: NUM_PARTICLES }, () => ({
      x: Math.random() * 360 - 180,
      y: Math.random() * 160 - 80,
      age: Math.random() * 100,
      maxAge: 60 + Math.random() * 80,
    }));

    // Interpolate wind at any lat/lng from sparse grid
    function getWind(lat: number, lng: number): { u: number; v: number; speed: number } {
      let totalWeight = 0;
      let u = 0, v = 0, speed = 0;
      
      for (const cell of windData) {
        const dlat = cell.lat - lat;
        const dlng = cell.lng - lng;
        const dist = Math.sqrt(dlat * dlat + dlng * dlng);
        if (dist < 0.1) return { u: cell.u, v: cell.v, speed: cell.speed };
        const weight = 1 / (dist * dist);
        u += cell.u * weight;
        v += cell.v * weight;
        speed += cell.speed * weight;
        totalWeight += weight;
      }
      
      if (totalWeight === 0) return { u: 0, v: 0, speed: 0 };
      return { u: u / totalWeight, v: v / totalWeight, speed: speed / totalWeight };
    }

    // Speed to colour
    function speedToColor(speed: number, alpha: number): string {
      if (speed < 5) return `rgba(100, 200, 255, ${alpha})`;
      if (speed < 15) return `rgba(100, 255, 150, ${alpha})`;
      if (speed < 30) return `rgba(255, 255, 100, ${alpha})`;
      if (speed < 50) return `rgba(255, 150, 50, ${alpha})`;
      return `rgba(255, 80, 80, ${alpha})`;
    }

    function animate() {
      if (!map.current) return;
      
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Only show particles on wind layer AND when we have data
      if (activeLayer !== 'wind' || windData.length === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';

      const particles = particlesRef.current;
      
      for (const p of particles) {
        const wind = getWind(p.y, p.x);
        
        // Move particle by wind
        const speedScale = 0.03;
        p.x += wind.u * speedScale;
        p.y += wind.v * speedScale;
        p.age++;
        
        // Wrap around or respawn
        if (p.x > 180) p.x -= 360;
        if (p.x < -180) p.x += 360;
        if (p.y > 85) p.y = -85 + Math.random() * 10;
        if (p.y < -85) p.y = 85 - Math.random() * 10;
        
        if (p.age > p.maxAge) {
          p.x = Math.random() * 360 - 180;
          p.y = Math.random() * 160 - 80;
          p.age = 0;
          p.maxAge = 60 + Math.random() * 80;
          continue;
        }
        
        // Project to screen
        const point = m.project([p.x, p.y]);
        if (point.x < -10 || point.x > rect.width + 10 || point.y < -10 || point.y > rect.height + 10) continue;
        
        // Age-based fade
        const lifeFrac = p.age / p.maxAge;
        const alpha = lifeFrac < 0.1 ? lifeFrac * 10 : lifeFrac > 0.8 ? (1 - lifeFrac) * 5 : 1;
        const clampAlpha = Math.max(0, Math.min(0.7, alpha * 0.7));
        
        // Draw
        const size = Math.max(1, Math.min(3, wind.speed / 15));
        ctx.fillStyle = speedToColor(wind.speed, clampAlpha);
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [windData, mapReady, activeLayer]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}

interface Particle {
  x: number; // lng
  y: number; // lat
  age: number;
  maxAge: number;
}
