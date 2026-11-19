import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

// Встроенные превью не меняют адресную строку — там маршруты держим в памяти.
// На GitHub Pages сайт живёт в подпапке (/social-net/), её отдаём роутеру как basename.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.VITE_ROUTER === 'memory' ? (
      <MemoryRouter>
        <App />
      </MemoryRouter>
    ) : (
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
);
