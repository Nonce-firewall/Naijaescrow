/**
 * SupportButton — self-contained trigger + dropdown.
 * Each instance owns its own state and ref, so desktop and mobile
 * never share a ref or duplicate mount the same dropdown.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { Headphones } from 'lucide-react';
import SupportDropdown from './SupportDropdown';

interface SupportButtonProps {
  className?: string;
}

export default function SupportButton({ className = '' }: SupportButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-2 rounded-lg border cursor-pointer transition ${
          open
            ? 'border-[#008751]/40 bg-[#E6F4EA] text-[#008751]'
            : 'border-[#E0E7E0] text-gray-600 hover:bg-[#F7F9F7]'
        }`}
        title="Contact Support"
        aria-label="Contact Support"
      >
        <Headphones className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && <SupportDropdown onClose={close} />}
      </AnimatePresence>
    </div>
  );
}
