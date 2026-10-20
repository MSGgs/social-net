import { useNavigate } from 'react-router-dom';
import { Copy, Play } from 'lucide-react';
import type { Post } from '../types';
import { compact } from '../utils/format';

/** Сетка 3×N, как в профиле Instagram */
export function PostGrid({ posts, basePath, empty }: { posts: Post[]; basePath: string; empty?: string }) {
  const navigate = useNavigate();
  if (!posts.length) return <div className="muted center pad">{empty ?? 'Публикаций пока нет'}</div>;
  return (
    <div className="post-grid">
      {posts.map((p) => (
        <button key={p.id} className="grid-cell" onClick={() => navigate(`${basePath}/${p.id}`)}>
          {p.type === 'video' ? (
            p.poster ? <img src={p.poster} alt="" loading="lazy" /> : <video src={p.media[0]} muted preload="metadata" />
          ) : (
            <img src={p.media[0]} alt="" loading="lazy" />
          )}
          {p.type === 'video' && (
            <span className="grid-views">
              <Play size={14} fill="currentColor" /> {compact(p.views)}
            </span>
          )}
          {p.type === 'photo' && p.media.length > 1 && <Copy size={16} className="grid-multi" />}
        </button>
      ))}
    </div>
  );
}
