import React from 'react';
import { ConnectionDemo } from '../components/websocket/ConnectionDemo';
import { WebSocketProvider } from '../contexts/WebSocketContext';

export const ConnectionDemoPage: React.FC = () => {
  return (
    <WebSocketProvider autoConnect={false}>
      <div className="page-container">
        <ConnectionDemo />
      </div>
    </WebSocketProvider>
  );
};

export default ConnectionDemoPage;