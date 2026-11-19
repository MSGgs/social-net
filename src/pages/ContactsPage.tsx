import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, MapPin, Search, Share2, UserPlus } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Sheet } from '../components/Sheet';
import { StoriesBar, hasUnseen } from '../components/StoriesBar';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { appLink, compact, presence } from '../utils/format';

export function ContactsPage() {
  const navigate = useNavigate();
  const users = useStore((s) => s.users);
  const contactIds = useStore((s) => s.contactIds);
  const followingIds = useStore((s) => s.followingIds);
  const stories = useStore((s) => s.stories);
  const { toggleFollow, addContact, toast } = useStore();
  const openStories = useUI((s) => s.openStories);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'activity' | 'name'>('activity');
  const [adding, setAdding] = useState(false);

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const matches = (id: string) => {
    const u = users[id];
    if (!q) return true;
    if (u.name.toLowerCase().includes(q) || u.username.includes(q)) return true;
    return digits.length >= 3 && !!u.phone?.replace(/\D/g, '').includes(digits);
  };

  const contacts = contactIds
    .filter((id) => users[id] && matches(id))
    .map((id) => users[id])
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'ru')
        : Number(!!b.online) - Number(!!a.online) || (b.lastSeen ?? 0) - (a.lastSeen ?? 0),
    );

  const creators = Object.values(users).filter((u) => u.followers && !contactIds.includes(u.id) && matches(u.id));

  return (
    <div className="screen page">
      <header className="page-header">
        <button className="link-btn" onClick={() => setSort(sort === 'activity' ? 'name' : 'activity')}>
          {sort === 'activity' ? 'По активности' : 'По имени'}
        </button>
        <h1>Контакты</h1>
        <button className="icon-btn accent" onClick={() => setAdding(true)} aria-label="Добавить контакт">
          <UserPlus size={24} />
        </button>
      </header>

      <div className="page-scroll">
        <label className="search">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени, нику или номеру" />
        </label>

        {!q && <StoriesBar />}

        {!q && (
          <div className="list">
            <button className="list-item" onClick={() => toast('Ищем людей рядом…')}>
              <span className="list-icon" style={{ background: '#34c759' }}>
                <MapPin size={20} />
              </span>
              <span className="list-text">Найти людей рядом</span>
            </button>
            <button
              className="list-item"
              onClick={() => {
                navigator.share?.({ title: 'Волна', text: 'Присоединяйся ко мне в Волне!', url: appLink('/') }).catch(() => {});
                toast('Ссылка-приглашение готова');
              }}
            >
              <span className="list-icon" style={{ background: 'var(--accent)' }}>
                <Share2 size={20} />
              </span>
              <span className="list-text">Пригласить друзей</span>
            </button>
          </div>
        )}

        <div className="section-title">
          Мои контакты · {contacts.length}
        </div>
        <div className="list">
          {contacts.map((u) => {
            const story = stories.find((st) => st.authorId === u.id && st.items.length);
            return (
              <div key={u.id} className="list-item" onClick={() => navigate(`/u/${u.id}`)}>
                <Avatar
                  src={u.avatar}
                  name={u.name}
                  size={46}
                  online={u.online}
                  ring={story ? (hasUnseen(story) ? 'unseen' : 'seen') : 'none'}
                  onClick={
                    story
                      ? () => {
                          openStories(u.id, [u.id]);
                        }
                      : undefined
                  }
                />
                <div className="list-text">
                  <div className="list-title">{u.name}</div>
                  <div className={`list-sub ${u.online ? 'accent' : ''}`}>{presence(u)}</div>
                </div>
              </div>
            );
          })}
          {!contacts.length && <div className="muted center pad">Никого не нашли</div>}
        </div>

        {creators.length > 0 && (
          <>
            <div className="section-title">Популярные авторы</div>
            <div className="list">
              {creators.map((u) => {
                const following = followingIds.includes(u.id);
                return (
                  <div key={u.id} className="list-item" onClick={() => navigate(`/u/${u.id}`)}>
                    <Avatar src={u.avatar} name={u.name} size={46} />
                    <div className="list-text">
                      <div className="list-title">
                        {u.name} {u.verified && <BadgeCheck size={15} className="verified" />}
                      </div>
                      <div className="list-sub">
                        @{u.username} · {compact(u.followers ?? 0)} подписчиков
                      </div>
                    </div>
                    <button
                      className={`btn small ${following ? 'secondary' : 'primary'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow(u.id);
                      }}
                    >
                      {following ? 'Вы подписаны' : 'Подписаться'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <AddContactSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSave={(name, phone) => {
          const id = addContact({ name, phone });
          setAdding(false);
          navigate(`/u/${id}`);
        }}
      />
    </div>
  );
}

function AddContactSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (name: string, phone: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const valid = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 11;

  return (
    <Sheet open={open} onClose={onClose} title="Новый контакт">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSave(name.trim(), phone.trim());
          setName('');
          setPhone('+7 ');
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя и фамилия" autoFocus />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 900 000-00-00" inputMode="tel" />
        <button className="btn primary block" disabled={!valid}>
          Создать контакт
        </button>
      </form>
    </Sheet>
  );
}
