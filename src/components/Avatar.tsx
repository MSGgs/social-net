import type { CSSProperties } from 'react';

interface Props {
  src?: string;
  name?: string;
  size?: number;
  ring?: 'none' | 'unseen' | 'seen';
  online?: boolean;
  onClick?: () => void;
  className?: string;
}

const palette = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774'];

export function Avatar({ src, name = '', size = 48, ring = 'none', online, onClick, className = '' }: Props) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const color = palette[(name.charCodeAt(0) || 0) % palette.length];
  const style = { '--size': `${size}px` } as CSSProperties;

  return (
    <div className={`avatar ring-${ring} ${onClick ? 'clickable' : ''} ${className}`} style={style} onClick={onClick}>
      <div className="avatar-inner" style={{ background: src ? undefined : color }}>
        {src ? <img src={src} alt={name} loading="lazy" draggable={false} /> : <span>{initials}</span>}
      </div>
      {online && <span className="avatar-online" />}
    </div>
  );
}
