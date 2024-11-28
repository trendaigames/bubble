import React, { useEffect, useRef, useState } from 'react';

interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
  AudioContext?: typeof AudioContext;
}

interface Note {
  x: number;
  y: number;
  frequency: number;
  collected?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const MusicRunnerGame = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [playerPosition, setPlayerPosition] = useState('bottom');
  const [notes, setNotes] = useState<Note[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameOver, setGameOver] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const bgmSchedulerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotePositionRef = useRef<'top' | 'bottom' | null>(null);

  const melody = [
    { note: 'C4', duration: 0.5 },
    { note: 'E4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
    { note: 'B4', duration: 0.5 },
    { note: 'A4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'E4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'A4', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
    { note: 'B4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'E4', duration: 0.5 },
    { note: 'C4', duration: 0.5 },
    { note: 'E4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
    { note: 'B4', duration: 0.5 },
    { note: 'A4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'E4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'A4', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
    { note: 'B4', duration: 0.5 },
    { note: 'G4', duration: 0.5 },
    { note: 'E4', duration: 0.5 },
    { note: 'C4', duration: 0.5 },
    { note: 'G4', duration: 0.5 }
  ] as const;

  const noteToFreq = (note: string): number => {
    const notes: Record<string, number> = {
      'C4': 261.63,
      'E4': 329.63,
      'G4': 392.00,
      'A4': 440.00,
      'B4': 493.88,
      'C5': 523.25
    };
    return notes[note] || 440;
  };

  const setupAudio = () => {
    const AudioContextClass = (window as WindowWithWebkit).AudioContext || (window as WindowWithWebkit).webkitAudioContext;
    if (AudioContextClass && (!audioContextRef.current || audioContextRef.current.state === 'closed')) {
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    playBGM(0);
  };

  const playBGM = (startTime: number) => {
    if (!audioContextRef.current || gameOver) return;

    let currentTime = startTime;
    const totalDuration = melody.reduce((sum, { duration }) => sum + duration, 0);
    
    melody.forEach(({ note, duration }) => {
      const oscillator = audioContextRef.current!.createOscillator();
      const gainNode = audioContextRef.current!.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(noteToFreq(note), audioContextRef.current!.currentTime + currentTime);
      
      gainNode.gain.setValueAtTime(0.2, audioContextRef.current!.currentTime + currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current!.currentTime + currentTime + duration - 0.05);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current!.destination);
      
      oscillator.start(audioContextRef.current!.currentTime + currentTime);
      oscillator.stop(audioContextRef.current!.currentTime + currentTime + duration);
      
      currentTime += duration;
    });

    if (!gameOver) {
      bgmSchedulerRef.current = setTimeout(() => {
        playBGM(currentTime);
      }, totalDuration * 1000);
    }
  };

  const playNoteSound = (frequency: number) => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.3);
  };

  const createParticles = (x: number, y: number) => {
    const newParticles = Array.from({ length: 5 }, () => ({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 2) * 5,
      life: 1,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`
    }));
    setParticles(prev => [...prev, ...newParticles]);
  };

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = () => {
      setNotes(prev => {
        const movedNotes = prev
          .map(note => ({ ...note, x: note.x - 4 }))
          .filter(note => note.x > -20);

        if (Math.random() < 0.015) {
          const newPosition = lastNotePositionRef.current === 'top' ? 'bottom' : 'top';
          const y = newPosition === 'top' ? 75 : 225;
          
          const lastNote = movedNotes[movedNotes.length - 1];
          if (!lastNote || Math.abs(lastNote.x - 600) > 100) {
            movedNotes.push({
              x: 600,
              y,
              frequency: noteToFreq(melody[Math.floor(Math.random() * melody.length)].note)
            });
            lastNotePositionRef.current = newPosition;
          }
        }

        movedNotes.forEach(note => {
          const playerY = playerPosition === 'top' ? 75 : 225;
          if (Math.abs(note.x - 150) < 20 && Math.abs(note.y - playerY) < 20) {
            if (!note.collected) {
              note.collected = true;
              setScore(s => s + 1);
              playNoteSound(note.frequency);
              createParticles(note.x, note.y);
            }
          }
        });

        return movedNotes;
      });

      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.02
          }))
          .filter(p => p.life > 0)
      );

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, playerPosition]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        setPlayerPosition(prev => prev === 'top' ? 'bottom' : 'top');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cleanup = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (bgmSchedulerRef.current) {
      clearTimeout(bgmSchedulerRef.current);
      bgmSchedulerRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    if (gameOver) {
      cleanup();
    }
    return () => {
      if (!gameOver) {
        cleanup();
      }
    };
  }, [gameOver]);

  const startGame = async () => {
    cleanup();
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(15);
    setNotes([]);
    setParticles([]);
    lastNotePositionRef.current = null;
    // 少し遅延を入れてAudioContextの状態が完全にリセットされるのを待つ
    await new Promise(resolve => setTimeout(resolve, 100));
    setupAudio();
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">Music Runner</h1>
        <p className="mb-2">Score: {score} | Time: {timeLeft}s</p>
        {(!gameStarted || gameOver) && (
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={startGame}
          >
            {gameOver ? 'Play Again' : 'Start Game'}
          </button>
        )}
      </div>
      
      <svg 
        width="600" 
        height="300" 
        className="border border-gray-300 mx-auto"
        viewBox="0 0 600 300"
      >
        <rect width="600" height="300" fill="#1a1a2e" />
        <line x1="0" y1="150" x2="600" y2="150" stroke="#333" strokeWidth="2" />
        
        <g transform={`translate(150,${playerPosition === 'top' ? 75 : 225})`}>
          <circle r="15" fill="#4CAF50" />
          <path
            d="M-7,-7 L7,0 L-7,7 Z"
            fill="#81C784"
          />
        </g>

        {notes.map((note, i) => (
          <g
            key={i}
            transform={`translate(${note.x},${note.y})`}
            opacity={note.collected ? 0.3 : 1}
          >
            <circle r="12" fill="#FFD700" />
            <path
              d="M-6,0 L6,0 M0,-6 L0,6"
              stroke="#FFA000"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        ))}

        {particles.map((particle, i) => (
          <circle
            key={i}
            cx={particle.x}
            cy={particle.y}
            r={4 * particle.life}
            fill={particle.color}
            opacity={particle.life}
          />
        ))}
      </svg>
    </div>
  );
};

export default MusicRunnerGame;
