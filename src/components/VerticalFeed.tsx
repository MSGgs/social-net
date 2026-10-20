import { useEffect, useRef, useState } from 'react';
import { PostItem } from './PostItem';
import type { Post } from '../types';

interface Props {
  posts: Post[];
  /** Ставит ленту на паузу, когда вкладка неактивна */
  enabled?: boolean;
  startId?: string;
  onIndexChange?: (index: number) => void;
  empty?: React.ReactNode;
}

/** Вертикальная лента на весь экран со «щелчком» к каждому посту, как в TikTok */
export function VerticalFeed({ posts, enabled = true, startId, onIndexChange, empty }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.index);
            setIndex(i);
            onIndexChange?.(i);
          }
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [posts, onIndexChange]);

  useEffect(() => {
    if (!startId || !ref.current) return;
    const i = posts.findIndex((p) => p.id === startId);
    if (i > 0) ref.current.scrollTop = i * ref.current.clientHeight;
    // прокручиваем к стартовому посту только при первом рендере
  }, []);

  // клавиатура на десктопе: ↑/↓
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el || (e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === 'ArrowDown') el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
      if (e.key === 'ArrowUp') el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  if (!posts.length) return <div className="feed-empty">{empty}</div>;

  return (
    <div className="vertical-feed" ref={ref}>
      {posts.map((p, i) => (
        <div key={p.id} className="feed-cell" data-index={i}>
          {Math.abs(i - index) <= 2 ? <PostItem post={p} active={enabled && i === index} /> : null}
        </div>
      ))}
    </div>
  );
}
