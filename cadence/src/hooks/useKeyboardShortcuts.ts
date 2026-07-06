import { useEffect } from 'react';

export interface ShortcutBinding {
  /** e.g. 'n', '/', 'Escape' — compared case-insensitively */
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  handler: () => void;
  /** allow firing even while focused inside an input/textarea */
  allowInInput?: boolean;
}

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

export function useKeyboardShortcuts(bindings: ShortcutBinding[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      for (const binding of bindings) {
        const metaMatches = binding.ctrlOrCmd ? e.metaKey || e.ctrlKey : true;
        const shiftMatches = binding.shift ? e.shiftKey : !e.shiftKey || true;
        const keyMatches = e.key.toLowerCase() === binding.key.toLowerCase();

        if (keyMatches && metaMatches && (binding.shift ? shiftMatches : true)) {
          if (isTypingElement(e.target) && !binding.allowInInput) continue;
          e.preventDefault();
          binding.handler();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindings]);
}
