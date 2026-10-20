import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, BellOff, Check, CheckCheck, ChevronLeft, Clock, MailOpen, Megaphone, Pin, PinOff, Search, SquarePen, Trash2, Users, Bell } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { ActionSheet, Sheet } from '../components/Sheet';
import { useLongPress } from '../hooks/useLongPress';
import { ME_ID, useStore } from '../store/useStore';
import type { Chat } from '../types';
import { chatAvatar, chatListTime, chatTitle, lastMessage, messagePreview } from '../utils/format';

type Folder = 'all' | 'unread' | 'private' | 'group' | 'channel';
const folders: { id: Folder; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'unread', label: 'Непрочитанные' },
  { id: 'private', label: 'Личные' },
  { id: 'group', label: 'Группы' },
  { id: 'channel', label: 'Каналы' },
];

const lastTime = (c: Chat) => lastMessage(c)?.createdAt ?? 0;

export function ChatsPage() {
  const navigate = useNavigate();
  const chats = useStore((s) => s.chats);
  const users = useStore((s) => s.users);
  const [folder, setFolder] = useState<Folder>('all');
  const [query, setQuery] = useState('');
  const [archive, setArchive] = useState(false);
  const [menuChat, setMenuChat] = useState<Chat | null>(null);
  const [composing, setComposing] = useState(false);
  const { togglePin, toggleMute, toggleArchive, deleteChat, markChatRead } = useStore();

  const q = query.trim().toLowerCase();
  const inFolder = (c: Chat) =>
    folder === 'all' ? true : folder === 'unread' ? c.unread > 0 : c.type === folder;

  const archived = chats.filter((c) => c.archived);
  const visible = chats
    .filter((c) => (archive ? c.archived : !c.archived))
    .filter(inFolder)
    .filter((c) => !q || chatTitle(c, users).toLowerCase().includes(q) || c.messages.some((m) => m.text?.toLowerCase().includes(q)))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || lastTime(b) - lastTime(a));

  const counts = (f: Folder) => chats.filter((c) => !c.archived && c.unread > 0 && (f === 'all' || f === 'unread' || c.type === f)).length;

  return (
    <div className="screen page">
      <header className="page-header">
        {archive ? (
          <button className="icon-btn" onClick={() => setArchive(false)} aria-label="Назад">
            <ChevronLeft size={28} />
          </button>
        ) : (
          <span className="header-spacer" />
        )}
        <h1>{archive ? 'Архив' : 'Чаты'}</h1>
        <button className="icon-btn accent" onClick={() => setComposing(true)} aria-label="Новый чат">
          <SquarePen size={22} />
        </button>
      </header>

      <div className="page-scroll">
        <label className="search">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по чатам и сообщениям" />
        </label>

        {!archive && (
          <div className="folders">
            {folders.map((f) => (
              <button key={f.id} className={folder === f.id ? 'active' : ''} onClick={() => setFolder(f.id)}>
                {f.label}
                {counts(f.id) > 0 && f.id !== 'unread' && <span className="folder-count">{counts(f.id)}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="chat-list">
          {!archive && archived.length > 0 && folder === 'all' && !q && (
            <button className="chat-row" onClick={() => setArchive(true)}>
              <span className="list-icon big" style={{ background: 'var(--muted)' }}>
                <Archive size={24} />
              </span>
              <div className="chat-row-main">
                <div className="chat-row-top">
                  <b>Архив</b>
                </div>
                <div className="chat-row-bottom">
                  <span className="chat-preview">{archived.map((c) => chatTitle(c, users)).join(', ')}</span>
                </div>
              </div>
            </button>
          )}
          {visible.map((c) => (
            <ChatRow key={c.id} chat={c} onOpen={() => navigate(`/chats/${c.id}`)} onMenu={() => setMenuChat(c)} />
          ))}
          {!visible.length && <div className="muted center pad">{q ? 'Ничего не найдено' : 'Здесь пока пусто'}</div>}
        </div>
      </div>

      <ActionSheet
        open={!!menuChat}
        onClose={() => setMenuChat(null)}
        title={menuChat ? chatTitle(menuChat, users) : ''}
        actions={
          menuChat
            ? [
                ...(menuChat.archived
                  ? []
                  : [{ label: menuChat.pinned ? 'Открепить' : 'Закрепить', icon: menuChat.pinned ? <PinOff size={20} /> : <Pin size={20} />, onClick: () => togglePin(menuChat.id) }]),
                { label: menuChat.muted ? 'Включить уведомления' : 'Без звука', icon: menuChat.muted ? <Bell size={20} /> : <BellOff size={20} />, onClick: () => toggleMute(menuChat.id) },
                ...(menuChat.unread ? [{ label: 'Отметить прочитанным', icon: <MailOpen size={20} />, onClick: () => markChatRead(menuChat.id) }] : []),
                { label: menuChat.archived ? 'Вернуть из архива' : 'В архив', icon: <Archive size={20} />, onClick: () => toggleArchive(menuChat.id) },
                { label: menuChat.type === 'channel' ? 'Покинуть канал' : 'Удалить чат', icon: <Trash2 size={20} />, danger: true, onClick: () => deleteChat(menuChat.id) },
              ]
            : []
        }
      />
      <NewChatSheet open={composing} onClose={() => setComposing(false)} />
    </div>
  );
}

function ChatRow({ chat, onOpen, onMenu }: { chat: Chat; onOpen: () => void; onMenu: () => void }) {
  const users = useStore((s) => s.users);
  const typingId = useStore((s) => s.typing[chat.id]);
  const draft = chat.draft?.trim();
  const press = useLongPress(onMenu, onOpen);
  const last = lastMessage(chat);
  const title = chatTitle(chat, users);
  const peer = chat.peerId ? users[chat.peerId] : undefined;

  let preview: React.ReactNode = last ? messagePreview(last) : 'Нет сообщений';
  let author = '';
  if (last && chat.type === 'group') author = last.authorId === ME_ID ? 'Вы' : users[last.authorId]?.name.split(' ')[0] ?? '';
  if (draft) {
    preview = <><span className="danger-text">Черновик: </span>{draft}</>;
    author = '';
  }
  if (typingId) {
    preview = <span className="accent">{chat.type === 'group' ? `${users[typingId]?.name.split(' ')[0]} печатает…` : 'печатает…'}</span>;
    author = '';
  }

  return (
    <div className={`chat-row ${chat.pinned ? 'pinned' : ''}`} {...press}>
      <Avatar src={chatAvatar(chat, users)} name={title} size={56} online={peer?.online} />
      <div className="chat-row-main">
        <div className="chat-row-top">
          <b className="chat-title">
            {chat.type === 'group' && <Users size={15} />}
            {chat.type === 'channel' && <Megaphone size={15} />}
            {title}
            {chat.muted && <BellOff size={13} className="muted" />}
          </b>
          <span className="chat-time">
            {last?.authorId === ME_ID && chat.type !== 'channel' && <MessageStatusIcon status={last.status} />}
            {last && chatListTime(last.createdAt)}
          </span>
        </div>
        <div className="chat-row-bottom">
          <span className="chat-preview">
            {author && <span className="chat-preview-author">{author}: </span>}
            {preview}
          </span>
          {chat.unread > 0 ? (
            <span className={`unread ${chat.muted ? 'muted' : ''}`}>{chat.unread}</span>
          ) : (
            chat.pinned && <Pin size={15} className="muted pin-icon" />
          )}
        </div>
      </div>
    </div>
  );
}

export function MessageStatusIcon({ status }: { status: 'sending' | 'sent' | 'read' }) {
  if (status === 'sending') return <Clock size={14} className="status-icon" />;
  if (status === 'sent') return <Check size={16} className="status-icon" />;
  return <CheckCheck size={16} className="status-icon read" />;
}

function NewChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const users = useStore((s) => s.users);
  const contactIds = useStore((s) => s.contactIds);
  const { openPrivateChat, createGroup } = useStore();
  const [group, setGroup] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');

  const close = () => {
    onClose();
    setGroup(false);
    setSelected([]);
    setTitle('');
  };
  const contacts = contactIds.map((id) => users[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return (
    <Sheet open={open} onClose={close} tall title={group ? 'Новая группа' : 'Новое сообщение'}>
      {group && (
        <div className="form">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название группы" />
          <button
            className="btn primary block"
            disabled={!title.trim() || !selected.length}
            onClick={() => {
              const id = createGroup(title.trim(), selected);
              close();
              navigate(`/chats/${id}`);
            }}
          >
            Создать · {selected.length} уч.
          </button>
        </div>
      )}
      <div className="list">
        {!group && (
          <button className="list-item" onClick={() => setGroup(true)}>
            <span className="list-icon" style={{ background: 'var(--accent)' }}>
              <Users size={20} />
            </span>
            <span className="list-text accent">Создать группу</span>
          </button>
        )}
        {contacts.map((u) => {
          const on = selected.includes(u.id);
          return (
            <button
              key={u.id}
              className="list-item"
              onClick={() => {
                if (group) setSelected(on ? selected.filter((id) => id !== u.id) : [...selected, u.id]);
                else {
                  const id = openPrivateChat(u.id);
                  close();
                  navigate(`/chats/${id}`);
                }
              }}
            >
              <Avatar src={u.avatar} name={u.name} size={42} online={u.online} />
              <span className="list-text">
                <span className="list-title">{u.name}</span>
              </span>
              {group && <span className={`checkbox ${on ? 'on' : ''}`}>{on && <Check size={14} strokeWidth={3} />}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
