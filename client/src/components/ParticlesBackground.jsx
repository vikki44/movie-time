import React, { useEffect, useState } from 'react';

const HEART_TYPES = ['🩷', '🎀', '🌷', '🍓', '✨', '💕', '⭐', '🌸'];

export default function ParticlesBackground() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate initial particles
    const initialParticles = Array.from({ length: 20 }).map((_, i) => createParticle(i));
    setParticles(initialParticles);

    // Keep generating particles over time
    const interval = setInterval(() => {
      setParticles((prev) => {
        // Keep max 35 particles on screen to protect performance
        const active = prev.filter((p) => p.expiresAt > Date.now());
        if (active.length < 35) {
          return [...active, createParticle(Math.random())];
        }
        return active;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const createParticle = (id) => {
    const size = Math.random() * 20 + 10; // 10px to 30px
    const left = Math.random() * 100; // 0% to 100%
    const duration = Math.random() * 8 + 8; // 8s to 16s
    const delay = Math.random() * -10; // Negative delay so they start at different points on load
    const character = HEART_TYPES[Math.floor(Math.random() * HEART_TYPES.length)];

    return {
      id,
      size,
      left,
      duration,
      delay,
      character,
      expiresAt: Date.now() + (duration + Math.max(0, delay)) * 1000
    };
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
        background: 'transparent'
      }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: '-40px',
            fontSize: `${p.size}px`,
            opacity: 0,
            animationName: 'heartFloat',
            animationDuration: `${p.duration}s`,
            animationTimingFunction: 'linear',
            animationDelay: `${p.delay}s`,
            animationIterationCount: 'infinite',
            userSelect: 'none',
          }}
        >
          {p.character}
        </span>
      ))}
    </div>
  );
}
