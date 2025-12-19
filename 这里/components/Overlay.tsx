import React, { useState } from 'react';
import { TreeState } from '../types';

interface OverlayProps {
  treeState: TreeState;
  onToggle: () => void;
  onSendWish: (text: string) => void;
}

const Overlay: React.FC<OverlayProps> = ({ treeState, onToggle, onSendWish }) => {
  const [wishText, setWishText] = useState('');

  const handleWishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wishText.trim()) {
      onSendWish(wishText);
      setWishText('');
    }
  };

  const getButtonText = () => {
    switch (treeState) {
      case TreeState.TREE_SHAPE: return 'Reveal Message';
      case TreeState.TEXT_SHAPE: return 'Reform Tree';
      default: return 'Reveal Message';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-12 z-10">
      {/* Header */}
      <div className="flex flex-col items-start space-y-2">
        <h1 className="text-3xl md:text-5xl font-light text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          Arix Signature
        </h1>
        <p className="text-blue-100/70 text-sm md:text-base tracking-widest font-light border-l-2 border-cyan-400 pl-4">
          INTERACTIVE CHRISTMAS EXPERIENCE
        </p>
      </div>

      {/* Control Area & Wish Input */}
      <div className="flex flex-col items-center justify-end w-full space-y-8 pb-4">
        
        {/* Wish Form */}
        <form 
          onSubmit={handleWishSubmit}
          className="pointer-events-auto flex items-center space-x-4 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full w-full max-w-md group focus-within:border-cyan-400/50 transition-colors"
        >
          <input
            type="text"
            value={wishText}
            onChange={(e) => setWishText(e.target.value)}
            placeholder="Make a wish..."
            className="bg-transparent border-none outline-none text-white font-light tracking-widest text-sm w-full placeholder:text-white/20"
          />
          <button
            type="submit"
            className="text-white/40 hover:text-cyan-300 font-light tracking-[0.2em] text-xs uppercase transition-colors"
          >
            Send
          </button>
        </form>

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={`
            pointer-events-auto
            group relative px-10 py-4 
            backdrop-blur-md bg-white/5 border border-white/20 
            hover:bg-white/10 hover:border-cyan-300/50 
            transition-all duration-500 ease-out
            rounded-full overflow-hidden
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          <span className="relative flex items-center space-x-3">
            <span className={`
              w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] transition-colors duration-500
              ${treeState === TreeState.TREE_SHAPE ? 'bg-cyan-300 text-cyan-300' : 'bg-rose-300 text-rose-300'}
            `} />
            <span className="text-white font-light tracking-[0.15em] text-sm uppercase">
              {getButtonText()}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default Overlay;