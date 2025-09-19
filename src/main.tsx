import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Em desenvolvimento, evitar StrictMode para impedir efeitos duplos (useEffect rodando 2x)
// Isso reduz flicker e recarregamentos visuais. Em produção, manter StrictMode ligado.
if (import.meta.env.DEV) {
  root.render(<App />);
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
