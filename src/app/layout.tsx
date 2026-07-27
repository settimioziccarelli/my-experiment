import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Ricerca Universitaria - Costellazione Emotiva',
  description: 'Esperimento psicologico sugli avverbi e le emozioni.',
  openGraph: {
    title: 'Ricerca Universitaria - Costellazione Emotiva',
    description: 'Partecipa al nostro studio accademico.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}