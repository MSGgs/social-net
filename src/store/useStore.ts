import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Chat, ID, Message, Post, Settings, Story, User } from '../types';
import {
  ME_ID,
  autoReplies,
  initialChats,
  initialContacts,
  initialCreators,
  initialMe,
  initialPosts,
  initialSettings,
  initialStories,
} from '../data/mock';
import { uid } from '../utils/format';

interface Toast {
  id: ID;
  text: string;
}

interface State {
  users: Record<ID, User>;
  contactIds: ID[];
  followingIds: ID[];
  posts: Post[];
  stories: Story[];
  chats: Chat[];
  settings: Settings;

  // не сохраняется
  typing: Record<ID, ID | undefined>;
  toasts: Toast[];
  muted: boolean;

  toast: (text: string) => void;
  setMuted: (muted: boolean) => void;

  toggleLike: (postId: ID) => void;
  toggleSave: (postId: ID) => void;
  addComment: (postId: ID, text: string) => void;
  toggleCommentLike: (postId: ID, commentId: ID) => void;
  sharePost: (postId: ID, chatIds: ID[]) => void;
  addPost: (post: Omit<Post, 'id' | 'authorId' | 'likes' | 'shares' | 'views' | 'comments' | 'createdAt'>) => void;
  deletePost: (postId: ID) => void;

  markStoryViewed: (itemId: ID) => void;
  addStory: (item: { type: 'image' | 'video'; url: string }) => void;

  toggleFollow: (userId: ID) => void;
  addContact: (data: { name: string; phone: string }) => ID;
  removeContact: (userId: ID) => void;

  openPrivateChat: (userId: ID) => ID;
  createGroup: (title: string, memberIds: ID[]) => ID;
  sendMessage: (chatId: ID, msg: Partial<Pick<Message, 'text' | 'image' | 'replyToId' | 'sharedPostId' | 'storyReply'>>) => void;
  editMessage: (chatId: ID, messageId: ID, text: string) => void;
  deleteMessage: (chatId: ID, messageId: ID) => void;
  markChatRead: (chatId: ID) => void;
  setDraft: (chatId: ID, draft: string) => void;
  togglePin: (chatId: ID) => void;
  toggleMute: (chatId: ID) => void;
  toggleArchive: (chatId: ID) => void;
  deleteChat: (chatId: ID) => void;

  updateMe: (patch: Partial<User>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

const toRecord = (list: User[]) => Object.fromEntries(list.map((u) => [u.id, u]));

const initialData = () => ({
  users: toRecord([initialMe, ...initialContacts, ...initialCreators]),
  contactIds: initialContacts.map((u) => u.id),
  followingIds: ['c1', 'c6'],
  posts: initialPosts,
  stories: initialStories,
  chats: initialChats,
  settings: initialSettings,
});

const replyTimers = new Map<ID, number>();

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patchChat = (chatId: ID, fn: (c: Chat) => Chat) =>
        set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? fn(c) : c)) }));

      const patchPost = (postId: ID, fn: (p: Post) => Post) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? fn(p) : p)) }));

      /** Имитация собеседника: прочитал → печатает → ответил */
      const simulateReply = (chatId: ID) => {
        const chat = get().chats.find((c) => c.id === chatId);
        if (!chat || chat.type === 'channel') return;
        const responders = chat.memberIds.filter((id) => id !== ME_ID);
        if (!responders.length) return;
        const responder = responders[Math.floor(Math.random() * responders.length)];

        window.clearTimeout(replyTimers.get(chatId));
        const t1 = window.setTimeout(() => {
          patchChat(chatId, (c) => ({
            ...c,
            messages: c.messages.map((m) => (m.authorId === ME_ID ? { ...m, status: 'read' } : m)),
          }));
          set((s) => ({ typing: { ...s.typing, [chatId]: responder } }));
          const t2 = window.setTimeout(() => {
            const text = autoReplies[Math.floor(Math.random() * autoReplies.length)];
            const message: Message = { id: uid(), authorId: responder, text, createdAt: Date.now(), status: 'read' };
            set((s) => ({ typing: { ...s.typing, [chatId]: undefined } }));
            patchChat(chatId, (c) => ({ ...c, messages: [...c.messages, message], unread: c.unread + 1 }));
          }, 1200 + Math.random() * 1800);
          replyTimers.set(chatId, t2);
        }, 900 + Math.random() * 900);
        replyTimers.set(chatId, t1);
      };

      return {
        ...initialData(),
        typing: {},
        toasts: [],
        muted: !initialSettings.soundOnStart,

        toast: (text) => {
          const id = uid();
          set((s) => ({ toasts: [...s.toasts, { id, text }] }));
          window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2200);
        },
        setMuted: (muted) => set({ muted }),

        toggleLike: (postId) =>
          patchPost(postId, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) })),
        toggleSave: (postId) => {
          const saved = !get().posts.find((p) => p.id === postId)?.saved;
          patchPost(postId, (p) => ({ ...p, saved }));
          get().toast(saved ? 'Сохранено в избранное' : 'Удалено из избранного');
        },
        addComment: (postId, text) =>
          patchPost(postId, (p) => ({
            ...p,
            comments: [{ id: uid(), authorId: ME_ID, text, createdAt: Date.now(), likes: 0 }, ...p.comments],
          })),
        toggleCommentLike: (postId, commentId) =>
          patchPost(postId, (p) => ({
            ...p,
            comments: p.comments.map((c) =>
              c.id === commentId ? { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) } : c,
            ),
          })),
        sharePost: (postId, chatIds) => {
          chatIds.forEach((id) => get().sendMessage(id, { sharedPostId: postId }));
          patchPost(postId, (p) => ({ ...p, shares: p.shares + chatIds.length }));
          get().toast(chatIds.length > 1 ? `Отправлено в ${chatIds.length} чата` : 'Отправлено');
        },
        addPost: (data) => {
          const post: Post = {
            ...data,
            id: uid(),
            authorId: ME_ID,
            likes: 0,
            shares: 0,
            views: 0,
            comments: [],
            createdAt: Date.now(),
          };
          set((s) => ({ posts: [post, ...s.posts] }));
          get().toast('Публикация опубликована');
        },
        deletePost: (postId) => {
          set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) }));
          get().toast('Публикация удалена');
        },

        markStoryViewed: (itemId) =>
          set((s) => ({
            stories: s.stories.map((st) => ({
              ...st,
              items: st.items.map((it) => (it.id === itemId ? { ...it, viewed: true } : it)),
            })),
          })),
        addStory: (item) => {
          const story = { id: uid(), createdAt: Date.now(), viewed: true, ...item };
          set((s) => {
            const mine = s.stories.find((st) => st.authorId === ME_ID);
            const stories = mine
              ? s.stories.map((st) => (st.authorId === ME_ID ? { ...st, items: [...st.items, story] } : st))
              : [{ authorId: ME_ID, items: [story] }, ...s.stories];
            return { stories };
          });
          get().toast('История опубликована');
        },

        toggleFollow: (userId) => {
          const following = get().followingIds.includes(userId);
          set((s) => ({
            followingIds: following ? s.followingIds.filter((id) => id !== userId) : [...s.followingIds, userId],
          }));
          get().toast(following ? 'Вы отписались' : 'Вы подписались');
        },
        addContact: ({ name, phone }) => {
          const existing = Object.values(get().users).find((u) => u.phone === phone);
          if (existing) {
            if (!get().contactIds.includes(existing.id)) set((s) => ({ contactIds: [...s.contactIds, existing.id] }));
            return existing.id;
          }
          const id = uid();
          const user: User = {
            id,
            name,
            phone,
            username: name.toLowerCase().replace(/\s+/g, '.'),
            avatar: `https://i.pravatar.cc/200?u=${encodeURIComponent(phone)}`,
            lastSeen: Date.now() - 3_600_000,
          };
          set((s) => ({ users: { ...s.users, [id]: user }, contactIds: [...s.contactIds, id] }));
          get().toast('Контакт добавлен');
          return id;
        },
        removeContact: (userId) => {
          set((s) => ({ contactIds: s.contactIds.filter((id) => id !== userId) }));
          get().toast('Контакт удалён');
        },

        openPrivateChat: (userId) => {
          const existing = get().chats.find((c) => c.type === 'private' && c.peerId === userId);
          if (existing) {
            if (existing.archived) patchChat(existing.id, (c) => ({ ...c, archived: false }));
            return existing.id;
          }
          const chat: Chat = { id: `ch-${userId}`, type: 'private', peerId: userId, memberIds: [ME_ID, userId], unread: 0, messages: [] };
          set((s) => ({ chats: [chat, ...s.chats] }));
          return chat.id;
        },
        createGroup: (title, memberIds) => {
          const id = `ch-${uid()}`;
          const chat: Chat = {
            id,
            type: 'group',
            title,
            avatar: `https://picsum.photos/seed/${id}/200/200`,
            memberIds: [ME_ID, ...memberIds],
            unread: 0,
            messages: [{ id: uid(), authorId: ME_ID, text: `Группа «${title}» создана`, createdAt: Date.now(), status: 'read' }],
          };
          set((s) => ({ chats: [chat, ...s.chats] }));
          return id;
        },
        sendMessage: (chatId, data) => {
          const message: Message = { id: uid(), authorId: ME_ID, createdAt: Date.now(), status: 'sending', ...data };
          patchChat(chatId, (c) => ({ ...c, messages: [...c.messages, message], draft: '', archived: false }));
          window.setTimeout(
            () =>
              patchChat(chatId, (c) => ({
                ...c,
                messages: c.messages.map((m) => (m.id === message.id && m.status === 'sending' ? { ...m, status: 'sent' } : m)),
              })),
            350,
          );
          simulateReply(chatId);
        },
        editMessage: (chatId, messageId, text) =>
          patchChat(chatId, (c) => ({
            ...c,
            messages: c.messages.map((m) => (m.id === messageId ? { ...m, text, edited: true } : m)),
          })),
        deleteMessage: (chatId, messageId) =>
          patchChat(chatId, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== messageId) })),
        markChatRead: (chatId) => patchChat(chatId, (c) => (c.unread ? { ...c, unread: 0 } : c)),
        setDraft: (chatId, draft) => patchChat(chatId, (c) => ({ ...c, draft })),
        togglePin: (chatId) => patchChat(chatId, (c) => ({ ...c, pinned: !c.pinned })),
        toggleMute: (chatId) => {
          patchChat(chatId, (c) => ({ ...c, muted: !c.muted }));
          get().toast(get().chats.find((c) => c.id === chatId)?.muted ? 'Уведомления выключены' : 'Уведомления включены');
        },
        toggleArchive: (chatId) => {
          patchChat(chatId, (c) => ({ ...c, archived: !c.archived, pinned: false }));
          get().toast(get().chats.find((c) => c.id === chatId)?.archived ? 'Чат в архиве' : 'Чат возвращён из архива');
        },
        deleteChat: (chatId) => {
          set((s) => ({ chats: s.chats.filter((c) => c.id !== chatId) }));
          get().toast('Чат удалён');
        },

        updateMe: (patch) => set((s) => ({ users: { ...s.users, [ME_ID]: { ...s.users[ME_ID], ...patch } } })),
        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        resetAll: () => set({ ...initialData(), typing: {} }),
      };
    },
    {
      name: 'volna-store',
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: (k) => localStorage.getItem(k),
        removeItem: (k) => localStorage.removeItem(k),
        setItem: (k, v) => {
          // фото хранятся как data URL — при переполнении квоты не роняем приложение
          try {
            localStorage.setItem(k, v);
          } catch {
            console.warn('Хранилище заполнено, последние изменения не сохранены');
          }
        },
      })),
      partialize: (s) => ({
        users: s.users,
        contactIds: s.contactIds,
        followingIds: s.followingIds,
        // blob: ссылки не переживают перезагрузку — такие публикации не сохраняем
        posts: s.posts.filter((p) => !p.media.some((m) => m.startsWith('blob:'))),
        stories: s.stories.map((st) => ({ ...st, items: st.items.filter((it) => !it.url.startsWith('blob:')) })),
        chats: s.chats,
        settings: s.settings,
      }),
    },
  ),
);

export const useMe = () => useStore((s) => s.users[ME_ID]);
export { ME_ID };
