// ═══════════════════════════════════════════════════════════
// AttendAI — Modal Component
// Accessible dialog: role="dialog", labelled by its title, traps Tab focus,
// closes on Escape or backdrop click and restores focus to the opener.
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;

    // Focus the first form field if there is one, otherwise the dialog itself.
    const first =
      dialog?.querySelector<HTMLElement>('input, select, textarea') ??
      dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`
          relative w-full ${sizeStyles[size]}
          bg-[var(--bg-surface)] border border-[var(--border-light)]
          rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)]
          animate-scale-in overflow-hidden focus:outline-none
        `}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[var(--border)]">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
