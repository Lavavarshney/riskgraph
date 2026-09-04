import './globals.css';
import React from 'react';
import { Header } from '@/components/layout/Header';
import { WebSocketProvider } from '@/lib/websocket';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata = {
  title: 'RISKGRAPH | Real-Time Payment Risk Intelligence',
  description: 'See the fraud network, not just the payment.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className="bg-app">
      <body className="bg-app text-primary min-h-screen">
        <ThemeProvider>
          <WebSocketProvider>
            <Header />
            <main className="min-h-[calc(100vh-6.5rem)] overflow-y-auto p-4 md:p-6">{children}</main>
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
