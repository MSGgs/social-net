import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, ChevronLeft, Copy, Mic, Paperclip, Pencil, Phone, Play, Reply, Send, Smile, Trash2, X } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { ActionSheet } from '../components/Sheet';
import { MessageStatusIcon } from './ChatsPage';
import { useLongPress } from '../hooks/useLongPress';
import { ME_ID, useStore } from '../store/useStore';
import type { Chat, Message } from '../types';
import { chatAvatar, chatTitle, clock, compact, dayLabel, fileToDataUrl, messagePreview, plural, presence, sameDay } from '../utils/format';

const EMOJI = '😀😂🥹😍😘😎🤔😴😭😡👍👎👏🙏💪🔥❤️💔🎉✨😱🤝👀🌚🍻☕️🎬🏔🚗🐱'.match(/\p{Extended_Pictographic}️?/gu) ?? [];
const nameColors = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774'];
const colorFor = (id: string) => nameColors[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % nameColors.length];

export function ChatRoomPage() {
  const { id = '' } = useParams();
  const chat = useStore((s) => s.chats.find((c) => c.id === id));
  if (!chat) return <Navigate to="/chats" replace />;
  return <ChatRoom key={chat.id} chat={chat} />;
}

function ChatRoom({ chat }: { chat: Chat }) {
  const navigate = useNavigate();
  const users = useStore((s) => s.users);
  const typingId = useStore((s) => s.typing[chat.id]);
  const textSize = useStore((s) => s.settings.chatTextSize);
  const otherUnread = useStore((s) => s.chats.reduce((n, c) => n + (c.id !== chat.id && !c.muted ? c.unread : 0), 0));
  const { sendMessage, editMessage, deleteMessage, markChatRead, setDraft, toggleMute, toast } = useStore();

  const [text, setText] = useState(chat.draft ?? '');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [menuMsg, setMenuMsg] = useState<Message | null>(null);
  const [emoji, setEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  textRef.current = text;

  const title = chatTitle(chat, users);
  const peer = chat.peerId ? users[chat.peerId] : undefined;
  const isChannel = chat.type === 'channel';
  const count = chat.messages.length;

  // прочитываем входящие, пока чат открыт
  useEffect(() => {
    markChatRead(chat.id);
  }, [chat.id, count, markChatRead]);

  // черновик сохраняем при выходе
  useEffect(() => () => setDraft(chat.id, textRef.current), [chat.id, setDraft]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, typingId]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  let subtitle = '';
  if (typingId) subtitle = chat.type === 'group' ? `${users[typingId]?.name.split(' ')[0]} печатает…` : 'печатает…';
  else if (peer) subtitle = presence(peer);
  else if (chat.type === 'group') {
    const online = chat.memberIds.filter((m) => users[m]?.online).length;
    subtitle = `${chat.memberIds.length} ${plural(chat.memberIds.length, ['участник', 'участника', 'участников'])}${online ? `, ${online} в сети` : ''}`;
  } else subtitle = `${compact(chat.subscribers ?? 0)} подписчиков`;

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    if (editing) {
      editMessage(chat.id, editing.id, value);
      setEditing(null);
    } else {
      sendMessage(chat.id, { text: value, replyToId: replyTo?.id });
      setReplyTo(null);
    }
    setText('');
    inputRef.current?.focus();
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Пока можно отправлять только фото');
    try {
      const image = await fileToDataUrl(file, 1280);
      sendMessage(chat.id, { image, text: text.trim() || undefined, replyToId: replyTo?.id });
      setText('');
      setReplyTo(null);
    } catch {
      toast('Не удалось загрузить фото');
    }
  };

  const openHeader = () => {
    if (peer) navigate(`/u/${peer.id}`);
    else if (chat.type === 'group') toast(chat.memberIds.map((m) => (m === ME_ID ? 'Вы' : users[m]?.name.split(' ')[0])).join(', '));
  };

  const jumpTo = (messageId: string) => {
    const el = scrollRef.current?.querySelector(`[data-mid="${messageId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('flash');
    window.setTimeout(() => el?.classList.remove('flash'), 1200);
  };

  const byId = new Map(chat.messages.map((m) => [m.id, m]));
  const authorName = (m: Message) => (m.authorId === ME_ID ? 'Вы' : users[m.authorId]?.name ?? title);

  return (
    <div className="screen chat-room" style={{ '--chat-font': `${textSize}px` } as React.CSSProperties}>
      <header className="chat-header">
        <button className="back-btn" onClick={() => navigate('/chats')} aria-label="Назад">
          <ChevronLeft size={28} />
          {otherUnread > 0 && <span className="back-count">{otherUnread}</span>}
        </button>
        <div className="chat-header-info" onClick={openHeader}>
          <Avatar src={chatAvatar(chat, users)} name={title} size={40} online={peer?.online} />
          <div>
            <div className="chat-header-title">
              {title} {users[chat.memberIds[0]]?.verified && isChannel && <BadgeCheck size={15} className="verified" />}
            </div>
            <div className={`chat-header-sub ${typingId || peer?.online ? 'accent' : ''}`}>{subtitle}</div>
          </div>
        </div>
        {peer && (
          <button className="icon-btn accent" onClick={() => toast('Звонки появятся в следующем обновлении')} aria-label="Позвонить">
            <Phone size={22} />
          </button>
        )}
      </header>

      <div className="messages" ref={scrollRef} onClick={() => setEmoji(false)}>
        {!count && (
          <div className="chat-empty">
            <div className="chat-empty-card">
              <b>Здесь пока ничего нет…</b>
              <span>Отправьте сообщение или стикер 👋</span>
              <button onClick={() => sendMessage(chat.id, { text: '👋' })}>👋</button>
            </div>
          </div>
        )}
        {chat.messages.map((m, i) => {
          const prev = chat.messages[i - 1];
          const nextMsg = chat.messages[i + 1];
          const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
          const sameAsPrev = !newDay && prev?.authorId === m.authorId && m.createdAt - prev.createdAt < 5 * 60_000;
          const lastInGroup = !nextMsg || nextMsg.authorId !== m.authorId || !sameDay(nextMsg.createdAt, m.createdAt) || nextMsg.createdAt - m.createdAt >= 5 * 60_000;
          return (
            <Fragment key={m.id}>
              {newDay && <div className="day-sep"><span>{dayLabel(m.createdAt)}</span></div>}
              <Bubble
                message={m}
                chat={chat}
                showName={chat.type === 'group' && m.authorId !== ME_ID && !sameAsPrev}
                showAvatar={chat.type === 'group' && m.authorId !== ME_ID && lastInGroup}
                tail={lastInGroup}
                reply={m.replyToId ? byId.get(m.replyToId) : undefined}
                replyAuthor={authorName}
                onReplyClick={jumpTo}
                onMenu={() => setMenuMsg(m)}
              />
            </Fragment>
          );
        })}
        {typingId && (
          <div className="bubble-row in">
            <div className="bubble in tail typing-bubble">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {isChannel ? (
        <div className="composer channel">
          <button className="link-btn" onClick={() => toggleMute(chat.id)}>
            {chat.muted ? 'Включить уведомления' : 'Выключить уведомления'}
          </button>
        </div>
      ) : (
        <div className="composer-wrap">
          {(replyTo || editing) && (
            <div className="composer-context">
              {editing ? <Pencil size={20} className="accent" /> : <Reply size={20} className="accent" />}
              <div className="composer-context-text">
                <b className="accent">{editing ? 'Редактирование' : `Ответ · ${authorName(replyTo!)}`}</b>
                <span>{messagePreview((editing ?? replyTo)!)}</span>
              </div>
              <button
                className="icon-btn"
                onClick={() => {
                  if (editing) setText('');
                  setEditing(null);
                  setReplyTo(null);
                }}
                aria-label="Отмена"
              >
                <X size={20} />
              </button>
            </div>
          )}
          <div className="composer">
            <button className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Прикрепить">
              <Paperclip size={24} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="composer-input">
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Сообщение"
              />
              <button className="icon-btn" onClick={() => setEmoji(!emoji)} aria-label="Эмодзи">
                <Smile size={24} />
              </button>
            </div>
            {text.trim() ? (
              <button className="send-btn" onClick={submit} aria-label="Отправить">
                <Send size={20} />
              </button>
            ) : (
              <button className="icon-btn" onClick={() => toast('Удерживайте для записи голосового')} aria-label="Голосовое">
                <Mic size={24} />
              </button>
            )}
          </div>
          {emoji && (
            <div className="emoji-panel">
              {EMOJI.map((e) => (
                <button key={e} onClick={() => setText((t) => t + e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ActionSheet
        open={!!menuMsg}
        onClose={() => setMenuMsg(null)}
        actions={
          menuMsg
            ? [
                ...(!isChannel
                  ? [{ label: 'Ответить', icon: <Reply size={20} />, onClick: () => { setEditing(null); setReplyTo(menuMsg); inputRef.current?.focus(); } }]
                  : []),
                ...(menuMsg.text
                  ? [{ label: 'Копировать', icon: <Copy size={20} />, onClick: () => { navigator.clipboard?.writeText(menuMsg.text!).catch(() => {}); toast('Текст скопирован'); } }]
                  : []),
                ...(menuMsg.authorId === ME_ID && menuMsg.text
                  ? [{ label: 'Изменить', icon: <Pencil size={20} />, onClick: () => { setReplyTo(null); setEditing(menuMsg); setText(menuMsg.text!); inputRef.current?.focus(); } }]
                  : []),
                ...(menuMsg.authorId === ME_ID || chat.type === 'private'
                  ? [{ label: 'Удалить', icon: <Trash2 size={20} />, danger: true, onClick: () => deleteMessage(chat.id, menuMsg.id) }]
                  : []),
              ]
            : []
        }
      />
    </div>
  );
}

interface BubbleProps {
  message: Message;
  chat: Chat;
  showName: boolean;
  showAvatar: boolean;
  tail: boolean;
  reply?: Message;
  replyAuthor: (m: Message) => string;
  onReplyClick: (id: string) => void;
  onMenu: () => void;
}

function Bubble({ message: m, chat, showName, showAvatar, tail, reply, replyAuthor, onReplyClick, onMenu }: BubbleProps) {
  const navigate = useNavigate();
  const author = useStore((s) => s.users[m.authorId]);
  const shared = useStore((s) => (m.sharedPostId ? s.posts.find((p) => p.id === m.sharedPostId) : undefined));
  const sharedAuthor = useStore((s) => (shared ? s.users[shared.authorId] : undefined));
  const press = useLongPress(onMenu);
  const out = m.authorId === ME_ID && chat.type !== 'channel';
  const mediaOnly = !!m.image && !m.text && !reply;

  return (
    <div className={`bubble-row ${out ? 'out' : 'in'}`} data-mid={m.id}>
      {chat.type === 'group' && !out && (
        <div className="bubble-avatar">{showAvatar && <Avatar src={author?.avatar} name={author?.name} size={34} onClick={() => navigate(`/u/${m.authorId}`)} />}</div>
      )}
      <div className={`bubble ${out ? 'out' : 'in'} ${tail ? 'tail' : ''} ${mediaOnly ? 'media-only' : ''}`} {...press}>
        {showName && (
          <div className="bubble-name" style={{ color: colorFor(m.authorId) }}>
            {author?.name}
          </div>
        )}
        {reply && (
          <button className="bubble-reply" onClick={(e) => { e.stopPropagation(); onReplyClick(reply.id); }}>
            <b>{replyAuthor(reply)}</b>
            <span>{messagePreview(reply)}</span>
          </button>
        )}
        {m.storyReply && (
          <div className="bubble-story">
            <img src={m.storyReply} alt="" />
            <span>Ответ на историю</span>
          </div>
        )}
        {m.image && <img className="bubble-image" src={m.image} alt="" />}
        {m.sharedPostId && (
          <button className="bubble-post" onClick={() => shared && navigate(`/post/${shared.id}`)}>
            {shared ? (
              <>
                <div className="bubble-post-media">
                  <img src={shared.poster ?? shared.media[0]} alt="" />
                  {shared.type === 'video' && <Play size={30} fill="currentColor" />}
                </div>
                <div className="bubble-post-text">
                  <b>@{sharedAuthor?.username}</b>
                  <span>{shared.caption}</span>
                </div>
              </>
            ) : (
              <span className="muted">Публикация удалена</span>
            )}
          </button>
        )}
        {m.text && <span className="bubble-text">{m.text}</span>}
        <span className="bubble-meta">
          {m.edited && 'изм. '}
          {clock(m.createdAt)}
          {out && <MessageStatusIcon status={m.status} />}
        </span>
      </div>
    </div>
  );
}
