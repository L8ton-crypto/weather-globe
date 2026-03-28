'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  WeatherGridCell,
  isThunderstorm,
  isPrecipitation,
  getPrecipIntensity,
} from '@/lib/weather-grid';

interface WeatherEffectsProps {
  map: mapboxgl.Map | null;
  grid: WeatherGridCell[];
  enabled: boolean;
}

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
  lat: number;
  lng: number;
}

interface CloudPuff {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  drift: number;
  lat: number;
  lng: number;
}

interface LightningBolt {
  lat: number;
  lng: number;
  frame: number;
  maxFrame: number;
  intensity: number;
}

export default function WeatherEffects({ map, grid, enabled }: WeatherEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const rainRef = useRef<RainDrop[]>([]);
  const cloudsRef = useRef<CloudPuff[]>([]);
  const lightningRef = useRef<LightningBolt[]>([]);
  const lastLightningSpawn = useRef<number>(0);
  const frameCount = useRef<number>(0);

  // Find nearest grid cell to a point
  const getNearestCell = useCallback((lat: number, lng: number): WeatherGridCell | null => {
    if (grid.length === 0) return null;
    let best: WeatherGridCell | null = null;
    let bestDist = Infinity;
    for (const cell of grid) {
      const d = (cell.lat - lat) ** 2 + (cell.lng - lng) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = cell;
      }
    }
    return best;
  }, [grid]);

  // Interpolate cloud cover at a point from nearby cells
  const getCloudCover = useCallback((lat: number, lng: number): number => {
    let totalWeight = 0;
    let cover = 0;
    for (const cell of grid) {
      const d = Math.sqrt((cell.lat - lat) ** 2 + (cell.lng - lng) ** 2);
      if (d < 1) return cell.cloudCover;
      if (d > 20) continue;
      const w = 1 / (d * d);
      cover += cell.cloudCover * w;
      totalWeight += w;
    }
    return totalWeight > 0 ? cover / totalWeight : 0;
  }, [grid]);

  useEffect(() => {
    if (!map || !enabled || grid.length === 0) return;

    const container = map.getCanvasContainer();

    // Create overlay canvas
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '2';
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Spawn rain drops near precipitation cells
    function spawnRain() {
      const precipCells = grid.filter(c => isPrecipitation(c.weatherCode) || isThunderstorm(c.weatherCode));
      const drops: RainDrop[] = [];

      for (const cell of precipCells) {
        const intensity = getPrecipIntensity(cell.weatherCode);
        const count = Math.floor(intensity * 30);

        for (let i = 0; i < count; i++) {
          const lat = cell.lat + (Math.random() - 0.5) * 8;
          const lng = cell.lng + (Math.random() - 0.5) * 8;
          drops.push({
            lat,
            lng,
            x: 0,
            y: 0,
            speed: 3 + Math.random() * 5,
            length: 8 + Math.random() * 16,
            opacity: 0.15 + Math.random() * 0.35,
          });
        }
      }
      rainRef.current = drops;
    }

    // Spawn cloud puffs where cloud cover is high
    function spawnClouds() {
      const cloudCells = grid.filter(c => c.cloudCover > 60);
      const puffs: CloudPuff[] = [];

      for (const cell of cloudCells) {
        const count = Math.floor((cell.cloudCover / 100) * 5);
        for (let i = 0; i < count; i++) {
          const lat = cell.lat + (Math.random() - 0.5) * 10;
          const lng = cell.lng + (Math.random() - 0.5) * 10;
          puffs.push({
            lat,
            lng,
            x: 0,
            y: 0,
            radius: 20 + Math.random() * 40,
            opacity: 0.03 + (cell.cloudCover / 100) * 0.08,
            drift: (Math.random() - 0.5) * 0.02,
          });
        }
      }
      cloudsRef.current = puffs;
    }

    spawnRain();
    spawnClouds();

    // Spawn lightning at thunderstorm cells
    function trySpawnLightning(now: number) {
      if (now - lastLightningSpawn.current < 400) return; // throttle

      const stormCells = grid.filter(c => isThunderstorm(c.weatherCode));
      if (stormCells.length === 0) return;

      // Random chance per storm cell
      for (const cell of stormCells) {
        if (Math.random() < 0.03) {
          lightningRef.current.push({
            lat: cell.lat + (Math.random() - 0.5) * 6,
            lng: cell.lng + (Math.random() - 0.5) * 6,
            frame: 0,
            maxFrame: 6 + Math.floor(Math.random() * 8),
            intensity: 0.5 + Math.random() * 0.5,
          });
          lastLightningSpawn.current = now;
        }
      }
    }

    function drawLightningBolt(ctx: CanvasRenderingContext2D, x: number, y: number, intensity: number) {
      const segments = 4 + Math.floor(Math.random() * 4);
      const boltLength = 30 + Math.random() * 50;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 240, ${intensity})`;
      ctx.lineWidth = 1.5 + Math.random() * 1.5;
      ctx.shadowColor = 'rgba(180, 180, 255, 0.8)';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(x, y);

      let cx = x, cy = y;
      for (let i = 0; i < segments; i++) {
        cx += (Math.random() - 0.5) * 20;
        cy += boltLength / segments;
        ctx.lineTo(cx, cy);

        // Branch
        if (Math.random() < 0.3) {
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx + (Math.random() - 0.5) * 15,
            cy + 10 + Math.random() * 15
          );
          ctx.moveTo(cx, cy);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Flash glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 80);
      gradient.addColorStop(0, `rgba(200, 200, 255, ${intensity * 0.15})`);
      gradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    function animate() {
      if (!map) return;
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      frameCount.current++;
      const now = performance.now();

      // --- CLOUDS ---
      for (const puff of cloudsRef.current) {
        puff.lng += puff.drift;
        if (puff.lng > 180) puff.lng -= 360;
        if (puff.lng < -180) puff.lng += 360;

        const pt = map.project([puff.lng, puff.lat]);
        if (pt.x < -100 || pt.x > rect.width + 100 || pt.y < -100 || pt.y > rect.height + 100) continue;

        const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, puff.radius);
        gradient.addColorStop(0, `rgba(200, 210, 230, ${puff.opacity})`);
        gradient.addColorStop(0.6, `rgba(180, 190, 210, ${puff.opacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(180, 190, 210, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, puff.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- RAIN ---
      ctx.lineCap = 'round';
      for (const drop of rainRef.current) {
        const pt = map.project([drop.lng, drop.lat]);
        drop.x = pt.x;
        drop.y = pt.y + (frameCount.current * drop.speed) % rect.height;

        // Wrap vertically
        if (drop.y > rect.height + 20) drop.y -= rect.height + 40;

        if (drop.x < -20 || drop.x > rect.width + 20) continue;

        ctx.strokeStyle = `rgba(150, 180, 255, ${drop.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 1, drop.y + drop.length);
        ctx.stroke();
      }

      // --- LIGHTNING ---
      trySpawnLightning(now);

      const activeBolts = lightningRef.current.filter(b => b.frame < b.maxFrame);
      lightningRef.current = activeBolts;

      for (const bolt of activeBolts) {
        const pt = map.project([bolt.lng, bolt.lat]);
        if (pt.x < -50 || pt.x > rect.width + 50 || pt.y < -50 || pt.y > rect.height + 50) {
          bolt.frame = bolt.maxFrame; // kill offscreen
          continue;
        }

        // Only draw on certain frames for flickering effect
        if (bolt.frame === 0 || bolt.frame === 2 || bolt.frame === 4) {
          const fadeIntensity = bolt.intensity * (1 - bolt.frame / bolt.maxFrame);
          drawLightningBolt(ctx, pt.x, pt.y, fadeIntensity);
        }
        bolt.frame++;
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, [map, grid, enabled, getNearestCell, getCloudCover]);

  return null;
}
