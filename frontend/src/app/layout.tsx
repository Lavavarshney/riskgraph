import './globals.css';
import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { WebSocketProvider } from '@/lib/websocket';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata = {
  title: 'RISKGRAPH | Real-Time Risk Operations Platform',
  description: 'Institutional fraud containment platform combining transaction risk, behavioral anomalies, and network graph intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-app text-slate-100 flex min-h-screen">
        <ThemeProvider>
          <WebSocketProvider>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 p-6 overflow-y-auto">
                {children}
              </main>
            </div>
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
