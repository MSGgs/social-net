import { create } from 'zustand';
import type { ID } from '../types';

export type CreateMode = 'menu' | 'post' | 'story';

interface UIState {
  /** Очередь авторов историй и текущий автор */
  storyQueue: ID[];
  storyAuthorId: ID | null;
  commentsPostId: ID | null;
  sharePostId: ID | null;
  createMode: CreateMode | null;

  openStories: (authorId: ID, queue: ID[]) => void;
  setStoryAuthor: (authorId: ID | null) => void;
  openComments: (postId: ID | null) => void;
  openShare: (postId: ID | null) => void;
  openCreate: (mode: CreateMode | null) => void;
}

export const useUI = create<UIState>()((set) => ({
  storyQueue: [],
  storyAuthorId: null,
  commentsPostId: null,
  sharePostId: null,
  createMode: null,

  openStories: (authorId, queue) => set({ storyAuthorId: authorId, storyQueue: queue }),
  setStoryAuthor: (storyAuthorId) => set({ storyAuthorId }),
  openComments: (commentsPostId) => set({ commentsPostId }),
  openShare: (sharePostId) => set({ sharePostId }),
  openCreate: (createMode) => set({ createMode }),
}));
