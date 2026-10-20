import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Heart, Send, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { ME_ID, useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { ago } from '../utils/format';

const IMAGE_DURATION = 5000;

export function StoryViewer() {
  const authorId = useUI((s) => s.storyAuthorId);
  if (!authorId) return null;
  // key сбрасывает состояние при переходе к следующему автору
  return createPortal(<Viewer key={authorId} authorId={authorId} />, document.getElementById('app-shell') ?? document.body);
}

function Viewer({ authorId }: { authorId: string }) {
  const story = useStore((s) => s.stories.find((st) => st.authorId === authorId));
  const author = useStore((s) => s.users[authorId]);
  const markViewed = useStore((s) => s.markStoryViewed);
  const openPrivateChat = useStore((s) => s.openPrivateChat);
  const sendMessage = useStore((s) => s.sendMessage);
  const toast = useStore((s) => s.toast);
  const { storyQueue, setStoryAuthor } = useUI();

  const items = useMemo(() => story?.items ?? [], [story]);
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((it) => !it.viewed)));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState('');
  const [liked, setLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimer = useRef<number>(0);
  const held = useRef(false);

  const item = items[index];
  const isMine = authorId === ME_ID;

  const close = () => setStoryAuthor(null);
  const nextAuthor = (dir: 1 | -1) => {
    const i = storyQueue.indexOf(authorId) + dir;
    if (i >= 0 && i < storyQueue.length) setStoryAuthor(storyQueue[i]);
    else close();
  };
  const next = () => {
    if (index < items.length - 1) {
      setIndex(index + 1);
      setProgress(0);
    } else nextAuthor(1);
  };
  const prev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setProgress(0);
    } else nextAuthor(-1);
  };

  useEffect(() => {
    if (item && !item.viewed) markViewed(item.id);
    setLiked(false);
  }, [item, markViewed]);

  // таймер для картинок; для видео прогресс берём из самого видео
  useEffect(() => {
    if (!item || paused) return;
    if (item.type === 'video') {
      videoRef.current?.play().catch(() => {});
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      setProgress((p) => {
        const np = p + dt / IMAGE_DURATION;
        return np >= 1 ? 1 : np;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [item, paused]);

  useEffect(() => {
    if (progress >= 1) next();
  }, [progress]);

  useEffect(() => {
    if (paused) videoRef.current?.pause();
  }, [paused]);

  if (!story || !item || !author) return null;

  const onPointerDown = () => {
    held.current = false;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setPaused(true);
    }, 200);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    window.clearTimeout(holdTimer.current);
    if (held.current) {
      setPaused(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 3) prev();
    else next();
  };

  const send = (text: string) => {
    const chatId = openPrivateChat(authorId);
    sendMessage(chatId, { text, storyReply: item.url });
    setReply('');
    setPaused(false);
    toast(`Отправлено ${author.name.split(' ')[0]}`);
  };

  return (
    <div className="story-viewer">
      <div className="story-progress">
        {items.map((it, i) => (
          <div key={it.id} className="story-progress-seg">
            <div style={{ width: `${(i < index ? 1 : i === index ? progress : 0) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="story-header">
        <Avatar src={author.avatar} name={author.name} size={36} />
        <div className="story-author">
          <b>{isMine ? 'Ваша история' : author.name}</b>
          <span>{ago(item.createdAt)}</span>
        </div>
        <button className="icon-btn" onClick={close} aria-label="Закрыть">
          <X size={26} />
        </button>
      </div>

      <div
        className="story-media"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => window.clearTimeout(holdTimer.current)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {item.type === 'image' ? (
          <img src={item.url} alt="" draggable={false} />
        ) : (
          <video
            ref={videoRef}
            src={item.url}
            autoPlay
            playsInline
            muted
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(Math.min(1, v.currentTime / Math.min(v.duration, 15)));
            }}
            onEnded={next}
          />
        )}
      </div>

      <div className="story-footer">
        {isMine ? (
          <div className="story-views">
            <Eye size={20} /> {12 + items.length * 7} просмотров
          </div>
        ) : (
          <form
            className="story-reply"
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim()) send(reply.trim());
            }}
          >
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => !reply && setPaused(false)}
              placeholder="Ответить…"
            />
            {reply.trim() ? (
              <button type="submit" className="icon-btn" aria-label="Отправить">
                <Send size={24} />
              </button>
            ) : (
              <button
                type="button"
                className={`icon-btn ${liked ? 'liked' : ''}`}
                onClick={() => {
                  if (!liked) send('❤️');
                  setLiked(true);
                }}
                aria-label="Нравится"
              >
                <Heart size={26} fill={liked ? 'currentColor' : 'none'} />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
