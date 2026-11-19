import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { CommentsSheet } from './components/CommentsSheet';
import { CreateSheet } from './components/CreateSheet';
import { ShareSheet } from './components/ShareSheet';
import { StoryViewer } from './components/StoryViewer';
import { Toasts } from './components/Toasts';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { ChatsPage } from './pages/ChatsPage';
import { ContactsPage } from './pages/ContactsPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { FeedPage } from './pages/FeedPage';
import { PostsViewerPage } from './pages/PostsViewerPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { UserPage } from './pages/UserPage';
import { useStore } from './store/useStore';

const TAB_ROUTES = ['/', '/contacts', '/chats', '/profile'];

function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  const accent = useStore((s) => s.settings.accent);

  useEffect(() => {
    // «Системная» — ничего не задаём: решают prefers-color-scheme и data-theme встраивающей страницы
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.appTheme;
    else root.dataset.appTheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);
}

export function App() {
  const { pathname } = useLocation();
  const setMuted = useStore((s) => s.setMuted);
  const withNav = TAB_ROUTES.includes(pathname);
  useTheme();

  useEffect(() => {
    setMuted(!useStore.getState().settings.soundOnStart);
  }, [setMuted]);

  return (
    <div id="app-shell" className={`app ${withNav ? 'with-nav' : ''}`}>
      {/* лента всегда смонтирована, чтобы не терять позицию при смене вкладок */}
      <FeedPage active={pathname === '/'} />
      <Routes>
        <Route path="/" element={null} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/u/:id" element={<UserPage />} />
        <Route path="/u/:userId/posts/:postId" element={<PostsViewerPage />} />
        <Route path="/post/:postId" element={<PostsViewerPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chats/:id" element={<ChatRoomPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile/:tab/:postId" element={<PostsViewerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/:section" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {withNav && <BottomNav />}
      <StoryViewer />
      <CommentsSheet />
      <ShareSheet />
      <CreateSheet />
      <Toasts />
    </div>
  );
}
