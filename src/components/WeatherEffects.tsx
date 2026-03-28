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
  lat: number;
  lng: number;
  speed: number;
  length: number;
  opacity: number;
  yOffset: number;
}

interface SnowFlake {
  lat: number;
  lng: number;
  size: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
  fallSpeed: number;
  yOffset: number;
}

interface CloudPuff {
  lat: number;
  lng: number;
  radius: number;
  opacity: number;
  drift: number;
}

interface FogBank {
  lat: number;
  lng: number;
  width: number;
  height: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

interface LightningBolt {
  lat: number;
  lng: number;
  frame: number;
  maxFrame: number;
  intensity: number;
}

interface WindStreak {
  lat: number;
  lng: number;
  angle: number;
  speed: number;
  length: number;
  life: number;
  maxLife: number;
}

interface AuroraWave {
  lat: number;
  lng: number;
  width: number;
  phase: number;
  speed: number;
  hue: number;
}

// Snow weather codes
function isSnow(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

// Fog codes
function isFog(code: number): boolean {
  return code === 45 || code === 48;
}

// Rain (not snow)
function isRain(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

export default function WeatherEffects({ map, grid, enabled }: WeatherEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const rainRef = useRef<RainDrop[]>([]);
  const snowRef = useRef<SnowFlake[]>([]);
  const cloudsRef = useRef<CloudPuff[]>([]);
  const fogRef = useRef<FogBank[]>([]);
  const lightningRef = useRef<LightningBolt[]>([]);
  const windRef = useRef<WindStreak[]>([]);
  const auroraRef = useRef<AuroraWave[]>([]);
  const lastLightningSpawn = useRef<number>(0);
  const frameCount = useRef<number>(0);

  // Check if a lat/lng is on the visible side of the globe
  const isVisible = useCallback((map: mapboxgl.Map, lng: number, lat: number): boolean => {
    try {
      // Get the map centre
      const centre = map.getCenter();
      // Angular distance from centre
      const dLat = (lat - centre.lat) * Math.PI / 180;
      const dLng = (lng - centre.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(centre.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const angularDist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      // At globe view, ~90 degrees from centre is the horizon
      return angularDist < Math.PI / 2;
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    if (!map || !enabled || grid.length === 0) return;

    const container = map.getContainer();

    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '10';
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

    // === SPAWN PARTICLES ===

    // Rain drops
    const rainCells = grid.filter(c => isRain(c.weatherCode));
    rainRef.current = [];
    for (const cell of rainCells) {
      const intensity = getPrecipIntensity(cell.weatherCode);
      const count = Math.floor(intensity * 25);
      for (let i = 0; i < count; i++) {
        rainRef.current.push({
          lat: cell.lat + (Math.random() - 0.5) * 8,
          lng: cell.lng + (Math.random() - 0.5) * 8,
          speed: 3 + Math.random() * 5,
          length: 8 + Math.random() * 16,
          opacity: 0.15 + Math.random() * 0.3,
          yOffset: Math.random() * 1000,
        });
      }
    }

    // Snow flakes
    const snowCells = grid.filter(c => isSnow(c.weatherCode));
    snowRef.current = [];
    for (const cell of snowCells) {
      const count = 15 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        snowRef.current.push({
          lat: cell.lat + (Math.random() - 0.5) * 10,
          lng: cell.lng + (Math.random() - 0.5) * 10,
          size: 1.5 + Math.random() * 3,
          opacity: 0.3 + Math.random() * 0.5,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.03,
          fallSpeed: 0.5 + Math.random() * 1.5,
          yOffset: Math.random() * 1000,
        });
      }
    }

    // Cloud puffs
    const cloudCells = grid.filter(c => c.cloudCover > 75);
    cloudsRef.current = [];
    for (const cell of cloudCells) {
      const count = Math.floor((cell.cloudCover / 100) * 2); // fewer puffs
      for (let i = 0; i < count; i++) {
        cloudsRef.current.push({
          lat: cell.lat + (Math.random() - 0.5) * 12,
          lng: cell.lng + (Math.random() - 0.5) * 12,
          radius: 30 + Math.random() * 40,
          opacity: 0.02 + (cell.cloudCover / 100) * 0.04, // much lower opacity
          drift: (Math.random() - 0.5) * 0.015,
        });
      }
    }

    // Fog banks
    const fogCells = grid.filter(c => isFog(c.weatherCode));
    fogRef.current = [];
    for (const cell of fogCells) {
      for (let i = 0; i < 3; i++) {
        fogRef.current.push({
          lat: cell.lat + (Math.random() - 0.5) * 6,
          lng: cell.lng + (Math.random() - 0.5) * 6,
          width: 60 + Math.random() * 80,
          height: 20 + Math.random() * 30,
          opacity: 0.06 + Math.random() * 0.06,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.005 + Math.random() * 0.01,
        });
      }
    }

    // Wind streaks (high wind areas 30+ km/h)
    const windCells = grid.filter(c => c.windSpeed >= 30);
    windRef.current = [];
    for (const cell of windCells) {
      const count = Math.floor(cell.windSpeed / 15);
      for (let i = 0; i < count; i++) {
        const dirRad = (cell.windDirection * Math.PI) / 180;
        windRef.current.push({
          lat: cell.lat + (Math.random() - 0.5) * 8,
          lng: cell.lng + (Math.random() - 0.5) * 8,
          angle: dirRad,
          speed: cell.windSpeed,
          length: 20 + (cell.windSpeed / 50) * 40,
          life: Math.random() * 100,
          maxLife: 80 + Math.random() * 60,
        });
      }
    }

    // Aurora waves (near poles, above 58° latitude)
    auroraRef.current = [];
    for (let lng = -180; lng < 180; lng += 15) {
      // Northern aurora
      auroraRef.current.push({
        lat: 65 + Math.random() * 10,
        lng: lng + Math.random() * 15,
        width: 40 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
        hue: Math.random() < 0.7 ? 120 + Math.random() * 40 : 270 + Math.random() * 40, // green or purple
      });
      // Southern aurora
      auroraRef.current.push({
        lat: -65 - Math.random() * 10,
        lng: lng + Math.random() * 15,
        width: 40 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
        hue: Math.random() < 0.7 ? 120 + Math.random() * 40 : 270 + Math.random() * 40,
      });
    }

    // === ANIMATION LOOP ===
    function trySpawnLightning(now: number) {
      if (now - lastLightningSpawn.current < 300) return;
      const stormCells = grid.filter(c => isThunderstorm(c.weatherCode));
      for (const cell of stormCells) {
        if (Math.random() < 0.04) {
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
        if (Math.random() < 0.3) {
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + (Math.random() - 0.5) * 15, cy + 10 + Math.random() * 15);
          ctx.moveTo(cx, cy);
        }
      }
      ctx.stroke();
      ctx.restore();
      // Glow
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 80);
      grad.addColorStop(0, `rgba(200, 200, 255, ${intensity * 0.15})`);
      grad.addColorStop(1, 'rgba(200, 200, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // Get sun position for day/night
    function getSunPosition(): { lat: number; lng: number } {
      const now = new Date();
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
      const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
      const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
      const sunLng = -(hours / 24) * 360 + 180;
      return { lat: declination, lng: sunLng > 180 ? sunLng - 360 : sunLng };
    }

    // Project a point only if visible on this side of globe
    function projectVisible(lng: number, lat: number): { x: number; y: number } | null {
      if (!isVisible(map!, lng, lat)) return null;
      const pt = map!.project([lng, lat]);
      const rect = container.getBoundingClientRect();
      if (pt.x < -30 || pt.x > rect.width + 30 || pt.y < -30 || pt.y > rect.height + 30) return null;
      return pt;
    }

    function animate() {
      if (!map) return;
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      frameCount.current++;
      const now = performance.now();
      const time = frameCount.current;

      // === DAY/NIGHT TERMINATOR ===
      const sun = getSunPosition();
      ctx.save();
      for (let lat = -75; lat <= 75; lat += 10) {
        for (let lng = -180; lng < 180; lng += 10) {
          const dLng = lng - sun.lng;
          const cosAngle = Math.sin(lat * Math.PI / 180) * Math.sin(sun.lat * Math.PI / 180) +
            Math.cos(lat * Math.PI / 180) * Math.cos(sun.lat * Math.PI / 180) * Math.cos(dLng * Math.PI / 180);
          if (cosAngle < 0.05) {
            const pt = projectVisible(lng, lat);
            if (!pt) continue;
            const darkness = cosAngle < -0.15 ? 0.18 : Math.max(0, (0.05 - cosAngle) * 0.9);
            const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 22);
            grad.addColorStop(0, `rgba(0, 3, 20, ${darkness})`);
            grad.addColorStop(1, `rgba(0, 3, 20, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 22, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();

      // === AURORA ===
      for (const a of auroraRef.current) {
        a.phase += a.speed;
        const pt = projectVisible(a.lng, a.lat);
        if (!pt) continue;

        const dLng = a.lng - sun.lng;
        const cosAngle = Math.sin(a.lat * Math.PI / 180) * Math.sin(sun.lat * Math.PI / 180) +
          Math.cos(a.lat * Math.PI / 180) * Math.cos(sun.lat * Math.PI / 180) * Math.cos(dLng * Math.PI / 180);
        if (cosAngle > 0.1) continue;

        const shimmer = 0.3 + Math.sin(a.phase) * 0.2 + Math.sin(a.phase * 2.3) * 0.1;
        const h = a.hue + Math.sin(a.phase * 0.5) * 20;

        ctx.save();
        const curtainHeight = 40 + Math.sin(a.phase * 1.5) * 15;
        const grad = ctx.createLinearGradient(pt.x, pt.y - curtainHeight, pt.x, pt.y + curtainHeight);
        grad.addColorStop(0, `hsla(${h}, 80%, 60%, 0)`);
        grad.addColorStop(0.3, `hsla(${h}, 80%, 55%, ${shimmer * 0.12})`);
        grad.addColorStop(0.5, `hsla(${h}, 85%, 50%, ${shimmer * 0.18})`);
        grad.addColorStop(0.7, `hsla(${h}, 80%, 55%, ${shimmer * 0.12})`);
        grad.addColorStop(1, `hsla(${h}, 80%, 60%, 0)`);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(pt.x - a.width / 2, pt.y - curtainHeight);
        for (let i = 0; i <= a.width; i += 3) {
          const wx = pt.x - a.width / 2 + i;
          const wave = Math.sin(a.phase + i * 0.05) * 8 + Math.sin(a.phase * 2 + i * 0.08) * 4;
          ctx.lineTo(wx, pt.y + wave - curtainHeight);
        }
        for (let i = a.width; i >= 0; i -= 3) {
          const wx = pt.x - a.width / 2 + i;
          const wave = Math.sin(a.phase + i * 0.05) * 8 + Math.sin(a.phase * 2 + i * 0.08) * 4;
          ctx.lineTo(wx, pt.y + wave + curtainHeight);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // === CLOUDS ===
      for (const puff of cloudsRef.current) {
        puff.lng += puff.drift;
        if (puff.lng > 180) puff.lng -= 360;
        if (puff.lng < -180) puff.lng += 360;
        const pt = projectVisible(puff.lng, puff.lat);
        if (!pt) continue;
        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, puff.radius);
        grad.addColorStop(0, `rgba(200, 210, 230, ${puff.opacity})`);
        grad.addColorStop(0.6, `rgba(180, 190, 210, ${puff.opacity * 0.5})`);
        grad.addColorStop(1, 'rgba(180, 190, 210, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, puff.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // === FOG ===
      for (const fog of fogRef.current) {
        fog.pulse += fog.pulseSpeed;
        const pt = projectVisible(fog.lng, fog.lat);
        if (!pt) continue;
        const pulseOpacity = fog.opacity * (0.7 + Math.sin(fog.pulse) * 0.3);
        ctx.save();
        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, fog.width / 2);
        grad.addColorStop(0, `rgba(180, 190, 200, ${pulseOpacity})`);
        grad.addColorStop(0.5, `rgba(160, 170, 185, ${pulseOpacity * 0.6})`);
        grad.addColorStop(1, 'rgba(160, 170, 185, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, fog.width / 2, fog.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // === RAIN ===
      ctx.lineCap = 'round';
      for (const drop of rainRef.current) {
        const pt = projectVisible(drop.lng, drop.lat);
        if (!pt) continue;
        const y = pt.y + ((time * drop.speed + drop.yOffset) % (rect.height + 40)) - 20;
        if (y < -20 || y > rect.height + 20) continue;
        ctx.strokeStyle = `rgba(150, 180, 255, ${drop.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pt.x, y);
        ctx.lineTo(pt.x - 1, y + drop.length);
        ctx.stroke();
      }

      // === SNOW ===
      for (const flake of snowRef.current) {
        flake.wobble += flake.wobbleSpeed;
        const pt = projectVisible(flake.lng, flake.lat);
        if (!pt) continue;
        const wobbleX = Math.sin(flake.wobble) * 8;
        const y = pt.y + ((time * flake.fallSpeed + flake.yOffset) % (rect.height + 40)) - 20;
        const x = pt.x + wobbleX;
        if (y < -20 || y > rect.height + 20) continue;

        ctx.fillStyle = `rgba(240, 245, 255, ${flake.opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, flake.size, 0, Math.PI * 2);
        ctx.fill();

        // Tiny sparkle on some flakes
        if (Math.sin(flake.wobble * 3) > 0.9) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity * 0.8})`;
          ctx.beginPath();
          ctx.arc(x, y, flake.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === WIND STREAKS ===
      for (const streak of windRef.current) {
        streak.life++;
        if (streak.life > streak.maxLife) {
          streak.life = 0;
          streak.lat += (Math.random() - 0.5) * 4;
          streak.lng += (Math.random() - 0.5) * 4;
        }
        const pt = projectVisible(streak.lng, streak.lat);
        if (!pt) continue;

        const lifeFrac = streak.life / streak.maxLife;
        const alpha = lifeFrac < 0.15 ? lifeFrac / 0.15 : lifeFrac > 0.7 ? (1 - lifeFrac) / 0.3 : 1;
        const len = streak.length * alpha;

        ctx.save();
        ctx.strokeStyle = `rgba(180, 210, 240, ${alpha * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(
          pt.x + Math.sin(streak.angle) * len,
          pt.y - Math.cos(streak.angle) * len
        );
        ctx.stroke();
        ctx.restore();
      }

      // === LIGHTNING ===
      trySpawnLightning(now);
      lightningRef.current = lightningRef.current.filter(b => b.frame < b.maxFrame);
      for (const bolt of lightningRef.current) {
        const pt = projectVisible(bolt.lng, bolt.lat);
        if (!pt) { bolt.frame = bolt.maxFrame; continue; }
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
  }, [map, grid, enabled]);

  return null;
}
