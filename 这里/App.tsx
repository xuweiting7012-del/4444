import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { TreeState, Wish } from './types';
import Experience from './components/Experience';
import Overlay from './components/Overlay';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.TREE_SHAPE);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const dragStartRef = useRef<number>(0);

  const toggleState = () => {
    setTreeState((prev) => {
      if (prev === TreeState.TREE_SHAPE) return TreeState.TEXT_SHAPE;
      return TreeState.TREE_SHAPE;
    });

    if (audioRef.current && !isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log("Audio waiting for interaction"));
    }
  };

  const handleSendWish = (text: string) => {
    const newWish: Wish = {
      id: Math.random().toString(36).substr(2, 9),
      startTime: Date.now() / 1000
    };
    setWishes(prev => [...prev, newWish]);
    
    // Auto cleanup after animation ends (approx 3.5 seconds)
    setTimeout(() => {
      setWishes(prev => prev.filter(w => w.id !== newWish.id));
    }, 3500);
  };

  useEffect(() => {
    const playAudio = async () => {
      if (audioRef.current) {
        audioRef.current.volume = 0.3;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.log("Autoplay blocked, waiting for interaction");
        }
      }
    };
    playAudio();
  }, []);

  const handlePointerDown = () => {
    dragStartRef.current = Date.now();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (Date.now() - dragStartRef.current < 200) {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking input or buttons
      if (target.tagName !== 'BUTTON' && target.tagName !== 'INPUT') {
        toggleState();
      }
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-[#050b14]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <audio 
        ref={audioRef} 
        loop 
        src="https://archive.org/download/MerryChristmasMrLawrence/RyuichiSakamoto-MerryChristmasMrLawrence.mp3" 
        crossOrigin="anonymous"
      />

      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 2, 22], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: false, toneMappingExposure: 1.2 }}
        shadows
      >
        <Suspense fallback={null}>
          <Experience treeState={treeState} wishes={wishes} />
        </Suspense>
      </Canvas>
      
      <Loader 
        containerStyles={{ background: '#050b14' }}
        barStyles={{ background: '#A5D6A7' }}
        dataStyles={{ color: '#E0F7FA', fontFamily: 'sans-serif' }}
      />
      
      <Overlay treeState={treeState} onToggle={toggleState} onSendWish={handleSendWish} />
    </div>
  );
};

export default App;