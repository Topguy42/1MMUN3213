'use client';

import { useEffect, useRef } from 'react';

const CustomCursor = ({ style = 'dot' }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (style === 'off') return;
    const el = ref.current;
    if (!el) return;
    
    const onMove = e => {
      el.style.left = e.clientX + 'px';
      el.style.top = e.clientY + 'px';
    };
    
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [style]);

  if (style === 'off') return null;

  return (
    <div 
      ref={ref} 
      className={`fixed pointer-events-none w-3 h-3 bg-white rounded-full shadow-lg mix-blend-screen`}
      style={{
        left: '0px',
        top: '0px',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
      }}
    />
  );
};

export default CustomCursor;
