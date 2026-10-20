import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, ChevronLeft, MessageCircle, MoreVertical, Phone, UserMinus, UserPlus, Ban, Link2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { ActionSheet } from '../components/Sheet';
import { PostGrid } from '../components/PostGrid';
import { hasUnseen } from '../components/StoriesBar';
import { ME_ID, useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { compact, presence } from '../utils/format';

/** Профиль другого пользователя: контакта или автора */
export function UserPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useStore((s) => s.users[id]);
  const allPosts = useStore((s) => s.posts);
  const story = useStore((s) => s.stories.find((st) => st.authorId === id && st.items.length));
  const isContact = useStore((s) => s.contactIds.includes(id));
  const following = useStore((s) => s.followingIds.includes(id));
  const { toggleFollow, openPrivateChat, removeContact, addContact, toast } = useStore();
  const openStories = useUI((s) => s.openStories);
  const [menu, setMenu] = useState(false);

  if (id === ME_ID) return <Navigate to="/profile" replace />;
  if (!user) return <Navigate to="/contacts" replace />;

  const posts = allPosts.filter((p) => p.authorId === id).sort((a, b) => b.createdAt - a.createdAt);
  const likes = posts.reduce((n, p) => n + p.likes, 0);

  const write = () => navigate(`/chats/${openPrivateChat(id)}`);

  return (
    <div className="screen page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ChevronLeft size={28} />
        </button>
        <h1 className="small">
          {user.username} {user.verified && <BadgeCheck size={16} className="verified" />}
        </h1>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Ещё">
          <MoreVertical size={22} />
        </button>
      </header>

      <div className="page-scroll">
        <div className="profile-head">
          <Avatar
            src={user.avatar}
            name={user.name}
            size={88}
            ring={story ? (hasUnseen(story) ? 'unseen' : 'seen') : 'none'}
            onClick={story ? () => openStories(id, [id]) : undefined}
          />
          <div className="profile-stats">
            <div>
              <b>{posts.length}</b>
              <span>публикаций</span>
            </div>
            <div>
              <b>{compact(user.followers ?? 100 + user.name.length * 7)}</b>
              <span>подписчиков</span>
            </div>
            <div>
              <b>{compact(likes)}</b>
              <span>лайков</span>
            </div>
          </div>
        </div>
        <div className="profile-bio">
          <b>{user.name}</b>
          {isContact && <div className={user.online ? 'accent' : 'muted'}>{presence(user)}</div>}
          {user.bio && <div>{user.bio}</div>}
          {isContact && user.phone && <div className="muted">{user.phone}</div>}
        </div>
        <div className="profile-actions">
          <button className="btn primary" onClick={write}>
            <MessageCircle size={18} /> Написать
          </button>
          {isContact ? (
            <button className="btn secondary" onClick={() => toast('Звонки появятся в следующем обновлении')}>
              <Phone size={18} /> Позвонить
            </button>
          ) : (
            <button className={`btn ${following ? 'secondary' : 'primary-outline'}`} onClick={() => toggleFollow(id)}>
              {following ? 'Вы подписаны' : 'Подписаться'}
            </button>
          )}
        </div>
        <PostGrid posts={posts} basePath={`/u/${id}/posts`} />
      </div>

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title={user.name}
        actions={[
          isContact
            ? { label: 'Удалить из контактов', icon: <UserMinus size={20} />, danger: true, onClick: () => removeContact(id) }
            : {
                label: 'Добавить в контакты',
                icon: <UserPlus size={20} />,
                onClick: () => addContact({ name: user.name, phone: user.phone ?? `+7 900 ${id}` }),
              },
          {
            label: 'Скопировать ссылку',
            icon: <Link2 size={20} />,
            onClick: () => {
              navigator.clipboard?.writeText(`${location.origin}/u/${id}`).catch(() => {});
              toast('Ссылка скопирована');
            },
          },
          { label: 'Заблокировать', icon: <Ban size={20} />, danger: true, onClick: () => toast(`${user.name} заблокирован(а)`) },
        ]}
      />
    </div>
  );
}
