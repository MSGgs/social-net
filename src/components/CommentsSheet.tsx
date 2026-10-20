import { useState } from 'react';
import { Heart, Send } from 'lucide-react';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { ME_ID, useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { ago, compact, plural } from '../utils/format';

export function CommentsSheet() {
  const postId = useUI((s) => s.commentsPostId);
  const openComments = useUI((s) => s.openComments);
  const close = () => openComments(null);
  const post = useStore((s) => s.posts.find((p) => p.id === postId));
  const users = useStore((s) => s.users);
  const { addComment, toggleCommentLike } = useStore();
  const [text, setText] = useState('');

  const n = post?.comments.length ?? 0;

  return (
    <Sheet open={!!post} onClose={close} tall title={`${n} ${plural(n, ['комментарий', 'комментария', 'комментариев'])}`}>
      {post && (
        <div className="comments">
          <div className="comments-list">
            {!n && <div className="muted center pad">Пока нет комментариев. Будьте первым!</div>}
            {post.comments.map((c) => {
              const u = users[c.authorId];
              return (
                <div key={c.id} className="comment">
                  <Avatar src={u?.avatar} name={u?.name} size={36} />
                  <div className="comment-body">
                    <div className="comment-author">
                      {u?.name ?? 'Пользователь'} <span className="muted">· {ago(c.createdAt)}</span>
                    </div>
                    <div>{c.text}</div>
                  </div>
                  <button className={`comment-like ${c.liked ? 'liked' : ''}`} onClick={() => toggleCommentLike(post.id, c.id)}>
                    <Heart size={16} fill={c.liked ? 'currentColor' : 'none'} />
                    <span>{compact(c.likes)}</span>
                  </button>
                </div>
              );
            })}
          </div>
          <form
            className="comment-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              addComment(post.id, text.trim());
              setText('');
            }}
          >
            <Avatar src={users[ME_ID].avatar} name={users[ME_ID].name} size={32} />
            <div className="emoji-quick">
              {['❤️', '😂', '🔥', '😍'].map((e) => (
                <button type="button" key={e} onClick={() => setText((t) => t + e)}>
                  {e}
                </button>
              ))}
            </div>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Добавить комментарий…" />
            <button type="submit" className="icon-btn accent" disabled={!text.trim()} aria-label="Отправить">
              <Send size={22} />
            </button>
          </form>
        </div>
      )}
    </Sheet>
  );
}
