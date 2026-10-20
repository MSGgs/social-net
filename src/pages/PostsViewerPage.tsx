import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { VerticalFeed } from '../components/VerticalFeed';
import { ME_ID, useStore } from '../store/useStore';
import { useUI } from '../store/useUI';

/**
 * Полноэкранный просмотр публикаций:
 *  /post/:postId                  — одна публикация (из чата или по ссылке)
 *  /u/:userId/posts/:postId       — все публикации автора, начиная с выбранной
 *  /profile/:tab/:postId          — мои публикации / видео / сохранённое
 */
export function PostsViewerPage() {
  const { userId, postId, tab } = useParams();
  const navigate = useNavigate();
  const posts = useStore((s) => s.posts);
  const storyOpen = useUI((s) => !!s.storyAuthorId);

  const list = useMemo(() => {
    const sorted = [...posts].sort((a, b) => b.createdAt - a.createdAt);
    if (tab === 'saved') return sorted.filter((p) => p.saved);
    if (tab) return sorted.filter((p) => p.authorId === ME_ID && (tab !== 'videos' || p.type === 'video'));
    if (userId) return sorted.filter((p) => p.authorId === userId);
    return sorted.filter((p) => p.id === postId);
    // список фиксируем при открытии, чтобы снятие из «Сохранённого» не выкидывало пост из-под пальца
  }, [userId, postId, tab]);

  // актуальные лайки/сохранения при зафиксированном порядке
  const live = useMemo(() => list.map((p) => posts.find((x) => x.id === p.id) ?? p), [list, posts]);

  if (!list.length) return <Navigate to="/" replace />;

  return (
    <div className="screen feed-screen full">
      <div className="feed-top">
        <div className="feed-header">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
            <ChevronLeft size={30} />
          </button>
        </div>
      </div>
      <VerticalFeed posts={live} startId={postId} enabled={!storyOpen} />
    </div>
  );
}
