'use client';

import { useEffect } from 'react';

export interface KeyboardShortcuts {
  onNewAppointment?: () => void;    // tecla 'n'
  onGoToToday?: () => void;         // tecla 't'
  onFocusSearch?: () => void;       // tecla '/'
  onToggleTimer?: () => void;       // tecla 'Space' (apenas quando nenhum input focado)
  onPrevDay?: () => void;           // seta esquerda
  onNextDay?: () => void;           // seta direita
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não disparar quando um input/textarea/select ou contentEditable está focado
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        return;
      }
      
      switch(e.key.toLowerCase()) {
        case 'n':
          shortcuts.onNewAppointment?.();
          break;
        case 't':
          shortcuts.onGoToToday?.();
          break;
        case '/': 
          e.preventDefault();
          shortcuts.onFocusSearch?.();
          break;
        case ' ':
          e.preventDefault();
          shortcuts.onToggleTimer?.();
          break;
        case 'arrowleft':
          shortcuts.onPrevDay?.();
          break;
        case 'arrowright':
          shortcuts.onNextDay?.();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
