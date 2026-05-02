import { useEffect, useRef, useState } from 'react';
import { GameEngine, GameState } from './GameEngine';
import { audioEngine } from './AudioEngine';
import { Play, Square, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    health: 100,
    maxHealth: 100,
    intensity: 0,
    gameOver: false,
  });
  
  const [musicActive, setMusicActive] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [gameStarted, setGameStarted] = useState(false);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new GameEngine(canvasRef.current, (state) => {
      setGameState(state);
      audioEngine.updateIntensity(state.intensity);
    });
    
    engineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  const startGame = () => {
    setGameStarted(true);
    engineRef.current?.reset();
    engineRef.current?.start();
    
    // Start music automatically when game starts
    if (!musicActive) {
      audioEngine.play();
      setMusicActive(true);
    }
  };

  const restartGame = () => {
    engineRef.current?.reset();
  };

  const toggleMusic = () => {
    if (musicActive) {
      audioEngine.stop();
    } else {
      audioEngine.play();
    }
    setMusicActive(!musicActive);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioEngine.setVolume(val);
  };

  return (
    <div className="relative w-full h-screen bg-[#00020a] overflow-hidden select-none">
      <div className="crt-overlay" />
      <div className="scanline" />
      
      {/* Game Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block" 
        style={{ cursor: gameStarted && !gameState.gameOver ? 'crosshair' : 'default' }}
      />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between">
        {/* Top Bar: HUD */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
             <div className="text-2xl font-bold uppercase tracking-widest text-shadow-cyan">
               <span data-text="SCORE:" className="glitch-text text-[var(--cyan)]">SCORE:</span> {String(gameState.score).padStart(6, '0')}
             </div>
             
             {/* Health Bar */}
             <div className="flex items-center gap-2">
               <span className="text-[var(--magenta)] text-sm tracking-wider">SYS.HP</span>
               <div className="w-48 h-4 border border-[var(--magenta)] p-[2px] bg-black/50">
                 <div 
                   className="h-full bg-[var(--magenta)] transition-all duration-200 shadow-[0_0_10px_var(--magenta)]" 
                   style={{ width: `${(Math.max(0, gameState.health) / gameState.maxHealth) * 100}%` }}
                 />
               </div>
             </div>
          </div>
          
          {/* Music Status */}
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
             <div className="flex items-center gap-4 bg-black/60 border border-[var(--cyan)] p-3 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
               <div className="flex flex-col mr-4">
                 <span className="text-xs text-[var(--cyan)] opacity-70">ALG_MUSIC_SYS / v2.1</span>
                 <span className="text-sm font-bold text-white tracking-widest">
                   INTENSITY: {Math.round(gameState.intensity * 100)}%
                 </span>
               </div>
               
               <button 
                 onClick={toggleMusic}
                 className="hover:scale-110 active:scale-95 transition-transform text-[var(--cyan)] hover:text-white"
               >
                 {musicActive ? <Square size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
               </button>
               
               <div className="flex items-center gap-2">
                 {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                 <input 
                   type="range" 
                   min="0" max="1" step="0.01" 
                   value={volume} 
                   onChange={handleVolumeChange}
                   className="w-20 accent-[var(--cyan)]"
                 />
               </div>
             </div>
          </div>
        </div>
        
        {/* Intensity Meter (Visual aesthetic) */}
        <div className="self-start flex items-end h-32 gap-1 opacity-50">
           {Array.from({length: 10}).map((_, i) => (
             <div 
               key={i} 
               className={`w-3 transition-all duration-100 ${i < gameState.intensity * 10 ? 'bg-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]' : 'bg-white/10'}`}
               style={{ height: `${20 + Math.random() * 80}%` }}
             />
           ))}
        </div>
      </div>
      
      {/* Start / Game Over Screens */}
      {(!gameStarted || gameState.gameOver) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="border border-[var(--magenta)] p-12 flex flex-col items-center gap-8 bg-black shadow-[0_0_30px_rgba(255,0,255,0.3)] relative">
            {/* Decal corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--cyan)] -translate-x-1 -translate-y-1" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--cyan)] translate-x-1 -translate-y-1" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--cyan)] -translate-x-1 translate-y-1" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--cyan)] translate-x-1 translate-y-1" />
            
            <h1 className="text-6xl text-white font-bold tracking-tighter uppercase glitch-text" data-text={gameState.gameOver ? "SYSTEM FAILURE" : "NEON VOID"}>
              {gameState.gameOver ? "SYSTEM FAILURE" : "NEON VOID"}
            </h1>
            
            {gameState.gameOver && (
              <div className="text-center">
                <p className="text-[var(--cyan)] text-xl mb-2">FINAL SCORE: {gameState.score}</p>
                <p className="text-white/50 text-sm italic">Enemy vessels breached the perimeter.</p>
              </div>
            )}
            
            {!gameStarted && (
              <div className="text-center max-w-sm">
                <p className="text-white/70 mb-4">Pilot the ship and defend against incoming waves. The algorithmic music engine will adapt to combat intensity.</p>
                <p className="text-[var(--magenta)] uppercase tracking-widest text-sm space-x-4">
                  <span>[WASD/ARROWS] Move</span>
                  <span>[SPACE] Fire</span>
                </p>
              </div>
            )}
            
            <button 
              onClick={gameState.gameOver ? restartGame : startGame}
              className="bg-transparent border border-[var(--cyan)] text-[var(--cyan)] hover:bg-[var(--cyan)] hover:text-black py-3 px-8 uppercase tracking-widest font-bold transition-all flex items-center gap-2"
            >
              {gameState.gameOver ? <RotateCcw size={18} /> : <Play size={18} />}
              {gameState.gameOver ? "INITIALIZE REBOOT" : "ENGAGE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
