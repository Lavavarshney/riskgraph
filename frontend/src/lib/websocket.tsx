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
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws/payments';
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
            // Auto-reconnect after 2 seconds
            reconnectTimer = setTimeout(connect, 2000);
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

    // Delay connection slightly to bypass React 18 Strict Mode immediate unmount
    connectTimer = setTimeout(connect, 50);

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
