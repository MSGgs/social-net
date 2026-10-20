import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, Clapperboard, Grid3x3, Lock, Plus, Settings, SquarePlus } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { PostGrid } from '../components/PostGrid';
import { useStoryQueue } from '../components/StoriesBar';
import { ME_ID, useMe, useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { compact } from '../utils/format';

type Tab = 'posts' | 'videos' | 'saved';

export function ProfilePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'posts';
  const me = useMe();
  const posts = useStore((s) => s.posts);
  const contacts = useStore((s) => s.contactIds.length);
  const following = useStore((s) => s.followingIds.length);
  const privateAccount = useStore((s) => s.settings.privateAccount);
  const toast = useStore((s) => s.toast);
  const { openCreate, openStories } = useUI();
  const { mine, queue } = useStoryQueue();

  const myPosts = posts.filter((p) => p.authorId === ME_ID).sort((a, b) => b.createdAt - a.createdAt);
  const shown =
    tab === 'saved' ? posts.filter((p) => p.saved) : tab === 'videos' ? myPosts.filter((p) => p.type === 'video') : myPosts;
  const likes = myPosts.reduce((n, p) => n + p.likes, 0);

  return (
    <div className="screen page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => openCreate('menu')} aria-label="Создать">
          <SquarePlus size={24} />
        </button>
        <h1 className="small">
          {privateAccount && <Lock size={15} />} {me.username}
        </h1>
        <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Настройки">
          <Settings size={24} />
        </button>
      </header>

      <div className="page-scroll">
        <div className="profile-head">
          <div className="story-me">
            <Avatar
              src={me.avatar}
              name={me.name}
              size={88}
              ring={mine ? 'seen' : 'none'}
              onClick={() => (mine ? openStories(ME_ID, queue) : openCreate('story'))}
            />
            <button className="story-add big" onClick={() => openCreate('story')} aria-label="Добавить историю">
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
          <div className="profile-stats">
            <div>
              <b>{myPosts.length}</b>
              <span>публикаций</span>
            </div>
            <div onClick={() => navigate('/contacts')}>
              <b>{contacts}</b>
              <span>контактов</span>
            </div>
            <div>
              <b>{compact(likes)}</b>
              <span>лайков</span>
            </div>
          </div>
        </div>
        <div className="profile-bio">
          <b>{me.name}</b>
          {me.bio && <div>{me.bio}</div>}
          <div className="muted">Подписки: {following}</div>
        </div>
        <div className="profile-actions">
          <button className="btn secondary" onClick={() => navigate('/profile/edit')}>
            Редактировать профиль
          </button>
          <button
            className="btn secondary"
            onClick={() => {
              navigator.clipboard?.writeText(`${location.origin}/u/${ME_ID}`).catch(() => {});
              toast('Ссылка на профиль скопирована');
            }}
          >
            Поделиться
          </button>
        </div>

        <div className="profile-tabs">
          {([
            ['posts', <Grid3x3 size={22} />],
            ['videos', <Clapperboard size={22} />],
            ['saved', <Bookmark size={22} />],
          ] as const).map(([id, icon]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setParams(id === 'posts' ? {} : { tab: id }, { replace: true })}>
              {icon}
            </button>
          ))}
        </div>
        <PostGrid
          posts={shown}
          basePath={`/profile/${tab}`}
          empty={tab === 'saved' ? 'Сохраняйте публикации — они появятся здесь, их видите только вы' : 'Поделитесь первым фото или видео'}
        />
      </div>
    </div>
  );
}
