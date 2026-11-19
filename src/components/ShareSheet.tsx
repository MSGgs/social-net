import { useState } from 'react';
import { Check, Link2, Search } from 'lucide-react';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { appLink, chatAvatar, chatTitle } from '../utils/format';

export function ShareSheet() {
  const postId = useUI((s) => s.sharePostId);
  const openShare = useUI((s) => s.openShare);
  const chats = useStore((s) => s.chats);
  const users = useStore((s) => s.users);
  const sharePost = useStore((s) => s.sharePost);
  const toast = useStore((s) => s.toast);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const close = () => {
    openShare(null);
    setSelected([]);
    setQuery('');
  };

  const targets = chats
    .filter((c) => c.type !== 'channel')
    .filter((c) => chatTitle(c, users).toLowerCase().includes(query.toLowerCase()));

  return (
    <Sheet open={!!postId} onClose={close} tall title="Отправить">
      <div className="share">
        <label className="search">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск" />
        </label>
        <div className="share-grid">
          {targets.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                className={`share-target ${on ? 'on' : ''}`}
                onClick={() => setSelected(on ? selected.filter((id) => id !== c.id) : [...selected, c.id])}
              >
                <div className="share-avatar">
                  <Avatar src={chatAvatar(c, users)} name={chatTitle(c, users)} size={58} />
                  {on && (
                    <span className="share-check">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <span>{chatTitle(c, users)}</span>
              </button>
            );
          })}
        </div>
        <div className="share-actions">
          <button
            className="btn secondary"
            onClick={() => {
              navigator.clipboard?.writeText(appLink(`/post/${postId}`)).catch(() => {});
              toast('Ссылка скопирована');
              close();
            }}
          >
            <Link2 size={18} /> Копировать ссылку
          </button>
          <button
            className="btn primary"
            disabled={!selected.length}
            onClick={() => {
              if (postId) sharePost(postId, selected);
              close();
            }}
          >
            Отправить{selected.length > 1 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
