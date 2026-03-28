'use client';

import { motion } from 'framer-motion';
import { Wind, Thermometer, CloudRain, Cloud, MapPin, Info } from 'lucide-react';

const LAYERS = [
  { key: 'wind' as const, label: 'Wind', icon: Wind, color: '#4fc3f7' },
  { key: 'temp' as const, label: 'Temperature', icon: Thermometer, color: '#ff7043' },
  { key: 'precip' as const, label: 'Precipitation', icon: CloudRain, color: '#42a5f5' },
  { key: 'clouds' as const, label: 'Clouds', icon: Cloud, color: '#bdbdbd' },
];

export default function Controls({
  activeLayer,
  onLayerChange,
  onLocate,
  windLoading,
}: {
  activeLayer: 'wind' | 'temp' | 'precip' | 'clouds';
  onLayerChange: (layer: 'wind' | 'temp' | 'precip' | 'clouds') => void;
  onLocate: () => void;
  windLoading: boolean;
}) {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-3">
      {/* Layer toggles */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700/50 p-3"
      >
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400 font-medium">LAYERS</span>
          {windLoading && activeLayer === 'wind' && (
            <span className="text-[10px] text-cyan-400 animate-pulse">Loading wind...</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {LAYERS.map(({ key, label, icon: Icon, color }) => {
            const active = activeLayer === key;
            return (
              <button
                key={key}
                onClick={() => onLayerChange(key)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${active
                    ? 'border border-current'
                    : 'bg-gray-800/50 text-gray-500 border border-gray-700/30 hover:text-gray-300'
                  }
                `}
                style={active ? {
                  color,
                  backgroundColor: color + '15',
                  borderColor: color + '40',
                } : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        <button
          onClick={onLocate}
          className="flex items-center gap-2 px-3 py-2 bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700/50 text-gray-300 hover:text-white hover:border-gray-600 transition-all text-xs"
        >
          <MapPin className="w-3.5 h-3.5" />
          My Location
        </button>
      </motion.div>

      {/* Legend for wind */}
      {activeLayer === 'wind' && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700/50 p-3"
        >
          <div className="text-[10px] text-gray-500 mb-1.5 uppercase">Wind Speed</div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-4 rounded-sm" style={{ background: 'rgb(100, 200, 255)' }} />
            <span className="text-[10px] text-gray-400">Calm</span>
            <div className="h-2 w-4 rounded-sm ml-1" style={{ background: 'rgb(100, 255, 150)' }} />
            <span className="text-[10px] text-gray-400">Light</span>
            <div className="h-2 w-4 rounded-sm ml-1" style={{ background: 'rgb(255, 255, 100)' }} />
            <span className="text-[10px] text-gray-400">Moderate</span>
            <div className="h-2 w-4 rounded-sm ml-1" style={{ background: 'rgb(255, 150, 50)' }} />
            <span className="text-[10px] text-gray-400">Strong</span>
            <div className="h-2 w-4 rounded-sm ml-1" style={{ background: 'rgb(255, 80, 80)' }} />
            <span className="text-[10px] text-gray-400">Severe</span>
          </div>
        </motion.div>
      )}

      {/* Click hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-[10px] text-gray-600 px-1"
      >
        Click anywhere on the globe for weather details
      </motion.div>
    </div>
  );
}
