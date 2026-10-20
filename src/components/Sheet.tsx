import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Растянуть почти на весь экран (комментарии, шаринг) */
  tall?: boolean;
  dark?: boolean;
}

export function Sheet({ open, onClose, title, children, tall, dark }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const root = document.getElementById('app-shell') ?? document.body;

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${tall ? 'tall' : ''} ${dark ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && <div className="sheet-title">{title}</div>}
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    root,
  );
}

interface Action {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

/** Список действий в нижнем листе — меню по долгому нажатию */
export function ActionSheet({ open, onClose, title, actions }: { open: boolean; onClose: () => void; title?: ReactNode; actions: Action[] }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="action-list">
        {actions.map((a) => (
          <button
            key={a.label}
            className={`action-item ${a.danger ? 'danger' : ''}`}
            onClick={() => {
              onClose();
              a.onClick();
            }}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
