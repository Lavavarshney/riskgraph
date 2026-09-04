'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any | null;
  sendMessage: (msg: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  lastMessage: null,
  sendMessage: () => {},
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);

  useEffect(() => {
    const getWsUrl = () => {
      if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return 'ws://127.0.0.1:8000/ws/payments';
        }
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${window.location.host}/ws/payments`;
      }
      return 'ws://127.0.0.1:8000/ws/payments';
    };

    const wsUrl = getWsUrl();
    let ws: WebSocket;
    let connectTimer: NodeJS.Timeout;
    let reconnectTimer: NodeJS.Timeout;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isMounted) setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
          } catch {
            setLastMessage(event.data);
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            // Auto-reconnect after 3 seconds
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          if (isMounted) setIsConnected(false);
        };

        setSocket(ws);
      } catch (e) {
        if (isMounted) setIsConnected(false);
      }
    };

    connectTimer = setTimeout(connect, 100);

    return () => {
      isMounted = false;
      clearTimeout(connectTimer);
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const sendMessage = (msg: any) => {
    if (socket && isConnected) {
      socket.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
