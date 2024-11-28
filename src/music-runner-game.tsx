import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from './components/ui/card';
import { CardHeader } from './components/ui/card';
import { CardTitle } from './components/ui/card';
import { CardContent } from './components/ui/card';
import { Volume2, VolumeX } from 'lucide-react';

// WebAudioContext の型定義
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

const BubblePop = () => {
  const [score, setScore] = useState(0);
  const [bubbles, setBubbles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioContextRef = useRef(null);
  const bgmIntervalRef = useRef(null);
  const gainNodeRef = useRef(null);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];

  // 音符と休符の配列（メロディパターン）
  const melody = [
    { note: 'C4', duration: 0.25 }, // ド
    { note: 'E4', duration: 0.25 }, // ミ
    { note: 'G4', duration: 0.25 }, // ソ
    { note: 'C5', duration: 0.25 }, // 高いド
    { note: 'G4', duration: 0.25 }, // ソ
    { note: 'E4', duration: 0.25 }, // ミ
    { note: 'rest', duration: 0.5 }, // 休符
    { note: 'A4', duration: 0.25 }, // ラ
    { note: 'F4', duration: 0.25 }, // ファ
    { note: 'D4', duration: 0.25 }, // レ
    { note: 'rest', duration: 0.25 }, // 休符
  ];

  // 音符の周波数マップ
  const noteFrequencies = {
    'C4': 261.63, // ド
    'D4': 293.66, // レ
    'E4': 329.63, // ミ
    'F4': 349.23, // ファ
    'G4': 392.00, // ソ
    'A4': 440.00, // ラ
    'B4': 493.88, // シ
    'C5': 523.25, // 高いド
  };

  // パーティクル生成関数
  const createParticles = (x, y, color) => {
    const particleCount = 8;
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      newParticles.push({
        id: Math.random(),
        x: x,
        y: y,
        size: 4,
        color: color,
        velocity: {
          x: Math.cos(angle) * 2,
          y: Math.sin(angle) * 2
        },
        lifetime: 1,
        createdAt: Date.now()
      });
    }
    
    return newParticles;
  };

  // 音声関連の初期化
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
  };

  // メロディ音の生成
  const playNote = (note, duration) => {
    if (!audioContextRef.current || isMuted || note === 'rest') return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      noteFrequencies[note],
      audioContextRef.current.currentTime
    );
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  // BGMの再生
  const playBGM = () => {
    if (!audioContextRef.current || isMuted) return;

    let noteIndex = 0;
    let lastNoteTime = 0;

    bgmIntervalRef.current = setInterval(() => {
      const currentNote = melody[noteIndex];
      
      if (audioContextRef.current.currentTime - lastNoteTime >= currentNote.duration) {
        playNote(currentNote.note, currentNote.duration);
        lastNoteTime = audioContextRef.current.currentTime;
        noteIndex = (noteIndex + 1) % melody.length;
      }
    }, 50);
  };

  // BGMの停止
  const stopBGM = () => {
    if (bgmIntervalRef.current) {
      clearInterval(bgmIntervalRef.current);
      bgmIntervalRef.current = null;
    }
  };

  // ポップ音の生成
  const playPopSound = () => {
    if (!audioContextRef.current || isMuted) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      880,
      audioContextRef.current.currentTime + 0.1
    );
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + 0.1
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  };

  const createBubble = useCallback(() => {
    const size = Math.random() * 40 + 20;
    const maxX = 400 - size;
    return {
      id: Math.random(),
      x: Math.max(size/2, Math.min(maxX - size/2, Math.random() * maxX)),
      y: 400,
      size: size,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 2 + 1,
    };
  }, []);

  const startGame = () => {
    initAudio();
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(30);
    setBubbles([]);
    setParticles([]);
    playBGM();
  };

  // バブルとパーティクルのアニメーション
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const bubbleInterval = setInterval(() => {
      setBubbles(prev => {
        const movedBubbles = prev
          .map(bubble => ({
            ...bubble,
            y: bubble.y - bubble.speed,
          }))
          .filter(bubble => bubble.y + bubble.size > 0);

        if (Math.random() < 0.1) {
          return [...movedBubbles, createBubble()];
        }
        return movedBubbles;
      });
    }, 50);

    const particleInterval = setInterval(() => {
      setParticles(prev => {
        const now = Date.now();
        return prev
          .map(particle => ({
            ...particle,
            x: particle.x + particle.velocity.x,
            y: particle.y + particle.velocity.y,
            velocity: {
              ...particle.velocity,
              y: particle.velocity.y + 0.1
            }
          }))
          .filter(particle => (now - particle.createdAt) < particle.lifetime * 1000);
      });
    }, 16);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          setGameStarted(false);
          stopBGM();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(bubbleInterval);
      clearInterval(particleInterval);
      clearInterval(timer);
    };
  }, [gameStarted, gameOver, createBubble]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      stopBGM();
    } else if (gameStarted) {
      playBGM();
    }
  };

  const popBubble = (id) => {
    const bubble = bubbles.find(b => b.id === id);
    if (bubble) {
      const newParticles = createParticles(
        bubble.x + bubble.size/2,
        bubble.y - bubble.size/2,
        bubble.color
      );
      setParticles(prev => [...prev, ...newParticles]);
    }
    setBubbles(prev => prev.filter(bubble => bubble.id !== id));
    setScore(prev => prev + 10);
    playPopSound();
  };

  return (
    <Card className="w-full max-w-lg mx-auto p-4">
      <div className="text-center mb-4">
        <div className="flex justify-between items-center px-4 mb-2">
          <h2 className="text-2xl font-bold">バブルポップ!</h2>
          <button
            onClick={toggleMute}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
        <div className="flex justify-between px-4">
          <p className="text-xl">スコア: {score}</p>
          <p className="text-xl">残り時間: {timeLeft}秒</p>
        </div>
      </div>

      {!gameStarted && !gameOver && (
        <div className="text-center">
          <button
            onClick={startGame}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            ゲームスタート
          </button>
        </div>
      )}

      {gameOver && (
        <div className="text-center">
          <h3 className="text-xl mb-4">ゲームオーバー! 最終スコア: {score}</h3>
          <button
            onClick={startGame}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            もう一度プレイ
          </button>
        </div>
      )}

      <svg
        viewBox="0 0 400 400"
        className="w-full h-96 bg-gray-100 rounded-lg"
        style={{ backgroundColor: '#f8f9fa' }}
      >
        {bubbles.map(bubble => (
          <circle
            key={bubble.id}
            cx={bubble.x + bubble.size/2}
            cy={bubble.y - bubble.size/2}
            r={bubble.size/2}
            fill={bubble.color}
            onClick={() => popBubble(bubble.id)}
            className="cursor-pointer"
            style={{
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))'
            }}
          >
            <animate
              attributeName="r"
              values={`${bubble.size/2-1};${bubble.size/2+1};${bubble.size/2-1}`}
              dur="3s"
              repeatCount="indefinite"
              additive="sum"
            />
          </circle>
        ))}
        
        {particles.map(particle => (
          <circle
            key={particle.id}
            cx={particle.x}
            cy={particle.y}
            r={particle.size}
            fill={particle.color}
            opacity={(1 - (Date.now() - particle.createdAt) / (particle.lifetime * 1000))}
          />
        ))}
      </svg>
    </Card>
  );
};

export default BubblePop;

