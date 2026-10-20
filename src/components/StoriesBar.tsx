import { Plus } from 'lucide-react';
import { Avatar } from './Avatar';
import { ME_ID, useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import type { Story } from '../types';

export const hasUnseen = (story?: Story) => !!story?.items.some((it) => !it.viewed);

/** Истории контактов: сначала мои, затем непросмотренные, затем просмотренные */
export function useStoryQueue() {
  const stories = useStore((s) => s.stories);
  const contactIds = useStore((s) => s.contactIds);
  const visible = stories.filter((st) => st.items.length && (st.authorId === ME_ID || contactIds.includes(st.authorId)));
  const mine = visible.find((st) => st.authorId === ME_ID);
  const others = visible
    .filter((st) => st.authorId !== ME_ID)
    .sort((a, b) => Number(hasUnseen(b)) - Number(hasUnseen(a)));
  return { mine, others, queue: [...(mine ? [mine] : []), ...others].map((s) => s.authorId) };
}

export function StoriesBar({ variant = 'plain' }: { variant?: 'plain' | 'overlay' }) {
  const users = useStore((s) => s.users);
  const { mine, others, queue } = useStoryQueue();
  const openStories = useUI((s) => s.openStories);
  const openCreate = useUI((s) => s.openCreate);
  const me = users[ME_ID];

  return (
    <div className={`stories-bar ${variant}`}>
      <div className="story-chip">
        <div className="story-me">
          <Avatar
            src={me.avatar}
            name={me.name}
            size={60}
            ring={mine ? 'seen' : 'none'}
            onClick={() => (mine ? openStories(ME_ID, queue) : openCreate('story'))}
          />
          <button className="story-add" onClick={() => openCreate('story')} aria-label="Добавить историю">
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>
        <span className="story-name">Ваша история</span>
      </div>
      {others.map((st) => {
        const u = users[st.authorId];
        if (!u) return null;
        return (
          <div key={st.authorId} className="story-chip">
            <Avatar
              src={u.avatar}
              name={u.name}
              size={60}
              ring={hasUnseen(st) ? 'unseen' : 'seen'}
              onClick={() => openStories(st.authorId, queue)}
            />
            <span className="story-name">{u.name.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
