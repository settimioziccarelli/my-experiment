import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Ricerca UNIPR - Affective Action Modulators (AAMs)',
  description: 'Percezione affettiva ed emotiva degli AAMs',
  openGraph: {
    title: 'Ricerca UNIPR - Affective Action Modulators (AAMs)',
    description: 'Partecipa al nostro studio',
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