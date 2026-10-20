export type ID = string;

export interface User {
  id: ID;
  name: string;
  username: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  online?: boolean;
  lastSeen?: number;
  verified?: boolean;
  followers?: number;
}

export interface Comment {
  id: ID;
  authorId: ID;
  text: string;
  createdAt: number;
  likes: number;
  liked?: boolean;
}

export type PostType = 'video' | 'photo';

export interface Post {
  id: ID;
  authorId: ID;
  type: PostType;
  /** Для видео — один url, для фото — карусель */
  media: string[];
  poster?: string;
  caption: string;
  music?: string;
  location?: string;
  likes: number;
  liked?: boolean;
  saved?: boolean;
  shares: number;
  views: number;
  comments: Comment[];
  createdAt: number;
}

export interface StoryItem {
  id: ID;
  type: 'image' | 'video';
  url: string;
  createdAt: number;
  viewed?: boolean;
}

export interface Story {
  authorId: ID;
  items: StoryItem[];
}

export type MessageStatus = 'sending' | 'sent' | 'read';

export interface Message {
  id: ID;
  authorId: ID;
  text?: string;
  image?: string;
  replyToId?: ID;
  sharedPostId?: ID;
  storyReply?: string;
  createdAt: number;
  status: MessageStatus;
  edited?: boolean;
}

export type ChatType = 'private' | 'group' | 'channel';

export interface Chat {
  id: ID;
  type: ChatType;
  /** Для личного чата — id собеседника */
  peerId?: ID;
  title?: string;
  avatar?: string;
  memberIds: ID[];
  subscribers?: number;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  unread: number;
  draft?: string;
  messages: Message[];
}

export type Audience = 'everyone' | 'contacts' | 'nobody';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeMode;
  accent: string;
  chatTextSize: number;
  autoplay: boolean;
  dataSaver: boolean;
  soundOnStart: boolean;
  notifyPrivate: boolean;
  notifyGroups: boolean;
  notifyChannels: boolean;
  notifyActivity: boolean;
  notifySound: boolean;
  privatePhone: Audience;
  privateLastSeen: Audience;
  privateStories: Audience;
  privateMessages: Audience;
  privateAccount: boolean;
  readReceipts: boolean;
  twoFactor: boolean;
}
