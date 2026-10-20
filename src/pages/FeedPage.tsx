import { useCallback, useMemo, useState } from 'react';
import { Plus, Volume2, VolumeX } from 'lucide-react';
import { VerticalFeed } from '../components/VerticalFeed';
import { StoriesBar, hasUnseen, useStoryQueue } from '../components/StoriesBar';
import { ME_ID, useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import type { Post } from '../types';

type Tab = 'following' | 'foryou';

/**
 * «Для вас» — рекомендованные видео вперемешку с фото и видео контактов,
 * «Подписки» — только контакты и те, на кого подписан.
 */
function mixFeed(posts: Post[], contactIds: string[], followingIds: string[], tab: Tab) {
  const fromFriends = posts
    .filter((p) => contactIds.includes(p.authorId))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (tab === 'following') {
    return posts
      .filter((p) => contactIds.includes(p.authorId) || followingIds.includes(p.authorId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  const recommended = posts
    .filter((p) => p.type === 'video' && p.authorId !== ME_ID && !contactIds.includes(p.authorId))
    .sort((a, b) => b.likes - a.likes);
  // каждый третий пост — от контакта
  const result: Post[] = [];
  let r = 0;
  let f = 0;
  while (r < recommended.length || f < fromFriends.length) {
    if (r < recommended.length) result.push(recommended[r++]);
    if (r < recommended.length) result.push(recommended[r++]);
    if (f < fromFriends.length) result.push(fromFriends[f++]);
  }
  return result;
}

export function FeedPage({ active }: { active: boolean }) {
  const posts = useStore((s) => s.posts);
  const users = useStore((s) => s.users);
  const contactIds = useStore((s) => s.contactIds);
  const followingIds = useStore((s) => s.followingIds);
  const muted = useStore((s) => s.muted);
  const setMuted = useStore((s) => s.setMuted);
  const openCreate = useUI((s) => s.openCreate);
  const storyOpen = useUI((s) => !!s.storyAuthorId);
  const { others } = useStoryQueue();

  const [tab, setTab] = useState<Tab>('foryou');
  const [index, setIndex] = useState(0);
  const [storiesOpen, setStoriesOpen] = useState(false);

  // порядок пересчитываем только при смене вкладки или состава ленты,
  // чтобы лайки и комментарии не перемешивали посты под пальцем
  const order = useMemo(
    () => mixFeed(posts, contactIds, followingIds, tab).map((p) => p.id),
    [tab, posts.length, contactIds.length, followingIds.length],
  );
  const feed = useMemo(() => {
    const byId = new Map(posts.map((p) => [p.id, p]));
    return order.map((id) => byId.get(id)).filter((p): p is Post => !!p);
  }, [order, posts]);

  const onIndexChange = useCallback((i: number) => {
    setIndex(i);
    setStoriesOpen(false);
  }, []);

  const showStories = index === 0 || storiesOpen;
  const unseen = others.filter(hasUnseen).slice(0, 3);

  return (
    <div className="screen feed-screen" style={{ display: active ? undefined : 'none' }}>
      <div className="feed-top">
        <div className="feed-header">
          <button className="icon-btn" onClick={() => openCreate('menu')} aria-label="Создать">
            <Plus size={26} />
          </button>
          <div className="feed-tabs">
            <button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>
              Подписки
            </button>
            <button className={tab === 'foryou' ? 'active' : ''} onClick={() => setTab('foryou')}>
              Для вас
            </button>
          </div>
          <button className="icon-btn" onClick={() => setMuted(!muted)} aria-label={muted ? 'Включить звук' : 'Выключить звук'}>
            {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
        {showStories ? (
          <StoriesBar variant="overlay" />
        ) : (
          unseen.length > 0 && (
            <button className="stories-pill" onClick={() => setStoriesOpen(true)}>
              <span className="stories-pill-avatars">
                {unseen.map((s) => (
                  <img key={s.authorId} src={users[s.authorId]?.avatar} alt="" />
                ))}
              </span>
              Истории
            </button>
          )
        )}
      </div>
      <VerticalFeed
        key={tab}
        posts={feed}
        enabled={active && !storyOpen}
        onIndexChange={onIndexChange}
        empty={<p>Подпишитесь на авторов или добавьте контакты, чтобы видеть их публикации</p>}
      />
    </div>
  );
}
