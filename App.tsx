
import React, { useState, useRef, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { RefreshCw, Layers, Activity, Building2, Pause, Play, Landmark } from 'lucide-react';
import { BuildingType } from './components/Building';

interface BuildingConfig {
  stories: number;
  type: BuildingType;
}

const App: React.FC = () => {
  const [config, setConfig] = useState<BuildingConfig>({ stories: 4, type: 'simple' });
  const [resetKey, setResetKey] = useState<number>(0);
  const [isQuaking, setIsQuaking] = useState(false);
  const [quakePower, setQuakePower] = useState(1); // 1.0 = M6.9, Higher values for M7.8+
  const [isPaused, setIsPaused] = useState(false);
  const [customDuration, setCustomDuration] = useState(15);
  const timeoutRef = useRef<any>(null);
  const pWaveTimeoutRef = useRef<any>(null);
  
  // Audio Context Ref to manage sound
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Reset duration when building type changes
  useEffect(() => {
    if (config.type === 'bank') {
        setCustomDuration(30); // Default to 30s for Bank as requested
    } else {
        setCustomDuration(15);
    }
  }, [config.type]);

  const stopEarthquakeSound = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const playEarthquakeSound = (duration: number, power: number) => {
    stopEarthquakeSound(); // Stop any existing sound

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      const durationSec = duration / 1000;
      
      // Create buffer for noise
      const bufferSize = ctx.sampleRate * durationSec;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate Brown Noise (Deep rumble, 1/f^2)
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Compensate for gain loss
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      // Lowpass filter to make it sound muffled and heavy (simulating earth movement)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      // Lower frequency for stronger quakes to sound "deeper"
      filter.frequency.value = 120 + (Math.random() * 50); 
      
      // Gain for volume envelope
      const gain = ctx.createGain();
      // M7.8 (power 1.3) should be significantly louder than M6.9 (power 1.0)
      const volume = Math.min(0.15 * Math.pow(power, 2), 0.8); 
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.5); // Fade in
      gain.gain.setValueAtTime(volume, ctx.currentTime + durationSec - 1.5);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec); // Fade out

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      noise.start();
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const handleRebuild = () => {
    stopEarthquakeSound();
    setResetKey(prev => prev + 1);
    setIsQuaking(false);
    setIsPaused(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (pWaveTimeoutRef.current) {
      clearTimeout(pWaveTimeoutRef.current);
    }
  };

  const handleConfigChange = (stories: number, type: BuildingType) => {
    setConfig({ stories, type });
    handleRebuild();
  };

  const handleEarthquake = (duration: number, power: number = 1) => {
    // Clear any existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (pWaveTimeoutRef.current) clearTimeout(pWaveTimeoutRef.current);

    setIsQuaking(true);

    // Special Logic for Bank M7.9 (Power >= 1.4)
    // Simulate P-Wave (Weak) -> S-Wave (Strong)
    if (config.type === 'bank' && power >= 1.4) {
      const pWaveRatio = 0.30 + (Math.random() * 0.10); 
      const pWaveDuration = duration * pWaveRatio;
      const sWaveDuration = duration - pWaveDuration;
      
      const pWavePower = 0.5;

      // Start P-Wave
      setQuakePower(pWavePower);
      playEarthquakeSound(pWaveDuration + 500, pWavePower);

      // Schedule S-Wave
      pWaveTimeoutRef.current = setTimeout(() => {
        setQuakePower(power); 
        playEarthquakeSound(sWaveDuration, power); 
      }, pWaveDuration);

      // Schedule End
      timeoutRef.current = setTimeout(() => {
        setIsQuaking(false);
      }, duration);

    } else {
      setQuakePower(power);
      playEarthquakeSound(duration, power);

      timeoutRef.current = setTimeout(() => {
        setIsQuaking(false);
      }, duration);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900">
      {/* UI Overlay - Compact Version */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl text-white w-64 scale-90 origin-top-left">
        <div className="flex items-center gap-2 mb-1">
           <div className="p-1.5 bg-blue-500 rounded-md">
             <Layers className="w-4 h-4 text-white" />
           </div>
           <h1 className="text-base font-bold tracking-tight">Physics Builder</h1>
        </div>
        
        <p className="text-[10px] text-slate-300 mb-1 leading-tight">
            Grab blocks with mouse. Right click to pan.
        </p>

        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Normal Buildings</label>
            <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
              <button
                onClick={() => handleConfigChange(4, 'simple')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  config.stories === 4 && config.type === 'simple'
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                4 Stories
              </button>
              <button
                onClick={() => handleConfigChange(5, 'simple')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  config.stories === 5 && config.type === 'simple'
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                5 Stories
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
             <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Large Structures</label>
             <button
                onClick={() => handleConfigChange(12, 'apartment')}
                className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                  config.type === 'apartment'
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'bg-black/20 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                12 Story Apt (9 Rooms)
              </button>
              
             <button
                onClick={() => handleConfigChange(10, 'bank')}
                className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                  config.type === 'bank'
                    ? 'bg-emerald-600 text-white shadow-lg' 
                    : 'bg-black/20 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Bank (10 Story)
              </button>
          </div>

          <div className="h-px bg-white/10 my-1" />

          <div className="flex gap-2">
            <button
              onClick={handleRebuild}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white py-2 px-1 rounded-lg font-semibold transition-all shadow-lg hover:shadow-emerald-500/25 text-[10px]"
            >
              <RefreshCw className="w-3 h-3" />
              Rebuild
            </button>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg font-semibold transition-all shadow-lg text-[10px] ${
                isPaused 
                  ? 'bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-white shadow-yellow-500/25'
                  : 'bg-slate-600 hover:bg-slate-500 active:scale-95 text-white'
              }`}
            >
              {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
              {isPaused ? "Resume" : "Pause"}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleEarthquake(5000, 1)}
              disabled={isQuaking}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-semibold transition-all shadow-lg text-xs ${
                isQuaking 
                  ? 'bg-orange-600 cursor-not-allowed opacity-80'
                  : 'bg-orange-500 hover:bg-orange-600 active:scale-95 hover:shadow-orange-500/25'
              } text-white`}
            >
              <Activity className={`w-3.5 h-3.5 ${isQuaking ? 'animate-pulse' : ''}`} />
              {isQuaking ? 'Active!' : 'M6.9 Quake (5s)'}
            </button>
            <button
              onClick={() => handleEarthquake(10000, 1)}
              disabled={isQuaking}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-semibold transition-all shadow-lg text-xs ${
                isQuaking 
                  ? 'bg-red-600 cursor-not-allowed opacity-80'
                  : 'bg-red-500 hover:bg-red-600 active:scale-95 hover:shadow-red-500/25'
              } text-white`}
            >
              <Activity className={`w-3.5 h-3.5 ${isQuaking ? 'animate-pulse' : ''}`} />
              {isQuaking ? 'Active!' : 'M6.9 Quake (10s)'}
            </button>
          </div>

          {/* Special M7.5 Manual Control for Apartment */}
          {config.type === 'apartment' && (
            <div className="flex flex-col gap-2 mt-1 p-2 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
               <label className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200 flex justify-between items-center">
                  <span>M7.5 Duration</span>
                  <span className="bg-indigo-800 px-1.5 py-0.5 rounded text-white">{customDuration}s</span>
               </label>
               <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={customDuration} 
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-indigo-400"
               />
               <button
                  onClick={() => handleEarthquake(customDuration * 1000, 1.2)}
                  disabled={isQuaking}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-semibold transition-all shadow-lg text-xs ${
                    isQuaking 
                    ? 'bg-indigo-800 cursor-not-allowed opacity-80'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 hover:shadow-indigo-500/25'
                  } text-white`}
                >
                  <Activity className={`w-3.5 h-3.5 ${isQuaking ? 'animate-pulse' : ''}`} />
                  {isQuaking ? 'Active!' : `Trigger M7.5 (${customDuration}s)`}
                </button>
            </div>
          )}

          {/* Special M7.9 Manual Control for Bank */}
          {config.type === 'bank' && (
            <div className="flex flex-col gap-2 mt-1 p-2 bg-purple-900/30 rounded-lg border border-purple-500/30">
               <label className="text-[10px] font-semibold uppercase tracking-wider text-purple-200 flex justify-between items-center">
                  <span>M7.9 Duration</span>
                  <span className="bg-purple-800 px-1.5 py-0.5 rounded text-white">{customDuration}s</span>
               </label>
               <input 
                  type="range" 
                  min="1" 
                  max="60" 
                  value={customDuration} 
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-purple-400"
               />
               <button
                  onClick={() => handleEarthquake(customDuration * 1000, 1.4)}
                  disabled={isQuaking}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-semibold transition-all shadow-lg text-xs ${
                    isQuaking 
                    ? 'bg-purple-800 cursor-not-allowed opacity-80'
                    : 'bg-purple-600 hover:bg-purple-700 active:scale-95 hover:shadow-purple-500/25'
                  } text-white`}
                >
                  <Activity className={`w-3.5 h-3.5 ${isQuaking ? 'animate-pulse' : ''}`} />
                  {isQuaking ? 'Active!' : `Trigger M7.9 (${customDuration}s)`}
                </button>
            </div>
          )}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        dpr={[1, 1.25]}
        performance={{ min: 0.5 }}
        camera={{ position: [35, 25, 35], fov: 45 }}
      >
        <Suspense fallback={null}>
           <Scene 
             key={resetKey} 
             stories={config.stories} 
             type={config.type} 
             isQuaking={isQuaking} 
             quakePower={quakePower}
             isPaused={isPaused}
           />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default App;
