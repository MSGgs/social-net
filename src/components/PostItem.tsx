import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Bookmark, Heart, MapPin, MessageCircle, Music2, Play, Plus, Send } from 'lucide-react';
import { Avatar } from './Avatar';
import { hasUnseen } from './StoriesBar';
import { ME_ID, useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import type { Post } from '../types';
import { ago, compact } from '../utils/format';

interface Props {
  post: Post;
  active: boolean;
}

/** Одиночный тап — действие, двойной — лайк с сердечком */
function useTapHandler(onSingle: () => void, onDouble: () => void) {
  const timer = useRef<number>(0);
  const last = useRef(0);
  return (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - last.current < 280) {
      window.clearTimeout(timer.current);
      last.current = 0;
      onDouble();
      return;
    }
    last.current = now;
    const target = e.currentTarget;
    timer.current = window.setTimeout(() => target.isConnected && onSingle(), 280);
  };
}

function useBurst() {
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const add = (x: number, y: number) => {
    const id = Date.now();
    setBursts((b) => [...b, { id, x, y }]);
    window.setTimeout(() => setBursts((b) => b.filter((i) => i.id !== id)), 900);
  };
  const node = bursts.map((b) => (
    <Heart key={b.id} className="like-burst" style={{ left: b.x, top: b.y }} size={96} fill="currentColor" />
  ));
  return { add, node };
}

export function PostItem({ post, active }: Props) {
  return post.type === 'video' ? <VideoPost post={post} active={active} /> : <PhotoPost post={post} active={active} />;
}

function VideoPost({ post, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoplay = useStore((s) => s.settings.autoplay);
  const dataSaver = useStore((s) => s.settings.dataSaver);
  const muted = useStore((s) => s.muted);
  const setMuted = useStore((s) => s.setMuted);
  const toggleLike = useStore((s) => s.toggleLike);
  const [paused, setPaused] = useState(!autoplay);
  const [progress, setProgress] = useState(0);
  const burst = useBurst();
  const lastPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!active || paused) {
      v.pause();
      return;
    }
    v.play().catch(() => {
      // браузер запрещает автозапуск со звуком без жеста — пробуем без звука
      if (v.muted) return setPaused(true);
      v.muted = true;
      setMuted(true);
      v.play().catch(() => setPaused(true));
    });
  }, [active, paused, setMuted]);

  useEffect(() => {
    if (!active) {
      setPaused(!autoplay);
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [active, autoplay]);

  const onTap = useTapHandler(
    () => setPaused((p) => !p),
    () => {
      if (!post.liked) toggleLike(post.id);
      burst.add(lastPoint.current.x, lastPoint.current.y);
    },
  );

  return (
    <div
      className="post-item"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        lastPoint.current = { x: e.clientX - r.left, y: e.clientY - r.top };
        onTap(e);
      }}
    >
      <video
        ref={videoRef}
        className="post-video"
        src={post.media[0]}
        poster={post.poster}
        loop
        playsInline
        muted={muted}
        preload={active ? 'auto' : dataSaver ? 'none' : 'metadata'}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setProgress(v.currentTime / v.duration);
        }}
      />
      {paused && (
        <div className="play-overlay">
          <Play size={72} fill="currentColor" />
        </div>
      )}
      {burst.node}
      <PostOverlay post={post} />
      <div className="video-progress">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

function PhotoPost({ post }: Props) {
  const [slide, setSlide] = useState(0);
  const toggleLike = useStore((s) => s.toggleLike);
  const burst = useBurst();
  const lastPoint = useRef({ x: 0, y: 0 });
  const onTap = useTapHandler(
    () => {},
    () => {
      if (!post.liked) toggleLike(post.id);
      burst.add(lastPoint.current.x, lastPoint.current.y);
    },
  );

  return (
    <div
      className="post-item photo"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        lastPoint.current = { x: e.clientX - r.left, y: e.clientY - r.top };
        onTap(e);
      }}
    >
      <div
        className="carousel"
        onScroll={(e) => {
          const el = e.currentTarget;
          setSlide(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {post.media.map((src, i) => (
          <div key={i} className="carousel-slide">
            <div className="carousel-blur" style={{ backgroundImage: `url(${src})` }} />
            <img src={src} alt="" draggable={false} loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
      {post.media.length > 1 && (
        <>
          <div className="carousel-counter">
            {slide + 1}/{post.media.length}
          </div>
          <div className="carousel-dots">
            {post.media.map((_, i) => (
              <span key={i} className={i === slide ? 'active' : ''} />
            ))}
          </div>
        </>
      )}
      {burst.node}
      <PostOverlay post={post} />
    </div>
  );
}

function PostOverlay({ post }: { post: Post }) {
  const navigate = useNavigate();
  const author = useStore((s) => s.users[post.authorId]);
  const isContact = useStore((s) => s.contactIds.includes(post.authorId));
  const following = useStore((s) => s.followingIds.includes(post.authorId));
  const story = useStore((s) => s.stories.find((st) => st.authorId === post.authorId && st.items.length));
  const { toggleLike, toggleSave, toggleFollow } = useStore();
  const { openComments, openShare, openStories } = useUI();
  const [expanded, setExpanded] = useState(false);

  if (!author) return null;
  const isMe = post.authorId === ME_ID;
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const openAuthor = () => navigate(isMe ? '/profile' : `/u/${author.id}`);

  return (
    <>
      <div className="post-rail">
        <div className="rail-avatar">
          <Avatar
            src={author.avatar}
            name={author.name}
            size={48}
            ring={story ? (hasUnseen(story) ? 'unseen' : 'seen') : 'none'}
            onClick={() => (story ? openStories(author.id, [author.id]) : openAuthor())}
          />
          {!isMe && !isContact && !following && (
            <button className="rail-follow" onClick={stop(() => toggleFollow(author.id))} aria-label="Подписаться">
              <Plus size={14} strokeWidth={3} />
            </button>
          )}
        </div>
        <button className={`rail-btn ${post.liked ? 'liked' : ''}`} onClick={stop(() => toggleLike(post.id))}>
          <Heart size={34} fill={post.liked ? 'currentColor' : 'rgba(0,0,0,.15)'} />
          <span>{compact(post.likes)}</span>
        </button>
        <button className="rail-btn" onClick={stop(() => openComments(post.id))}>
          <MessageCircle size={32} fill="rgba(0,0,0,.15)" />
          <span>{compact(post.comments.length)}</span>
        </button>
        <button className={`rail-btn ${post.saved ? 'saved' : ''}`} onClick={stop(() => toggleSave(post.id))}>
          <Bookmark size={32} fill={post.saved ? 'currentColor' : 'rgba(0,0,0,.15)'} />
          <span>{post.saved ? 'В избр.' : 'Сохр.'}</span>
        </button>
        <button className="rail-btn" onClick={stop(() => openShare(post.id))}>
          <Send size={30} />
          <span>{compact(post.shares)}</span>
        </button>
      </div>

      <div className="post-info" onClick={(e) => e.stopPropagation()}>
        {isContact && <span className="badge-contact">Ваш контакт</span>}
        <div className="post-author" onClick={openAuthor}>
          @{author.username}
          {author.verified && <BadgeCheck size={16} className="verified" />}
          <span className="post-time">· {ago(post.createdAt)}</span>
        </div>
        <div className={`post-caption ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
          {post.caption}
        </div>
        {post.location && (
          <div className="post-meta">
            <MapPin size={14} /> {post.location}
          </div>
        )}
        {post.music && (
          <div className="post-meta music">
            <Music2 size={14} />
            <div className="marquee">
              <span>{post.music}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
