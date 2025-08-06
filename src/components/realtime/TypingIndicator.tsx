import React from 'react';
import './TypingIndicator.css';

interface TypingIndicatorProps {
  typingUsers: Map<string, string>;
  currentUserId?: string;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  currentUserId,
  className = '',
}) => {
  // Filter out current user from typing users
  const otherTypingUsers = Array.from(typingUsers.entries()).filter(
    ([userId]) => userId !== currentUserId
  );

  if (otherTypingUsers.length === 0) {
    return null;
  }

  const getTypingMessage = (): string => {
    const userNames = otherTypingUsers.map(([, userName]) => userName);
    
    if (userNames.length === 1) {
      return `${userNames[0]}が入力中...`;
    } else if (userNames.length === 2) {
      return `${userNames[0]}と${userNames[1]}が入力中...`;
    } else if (userNames.length === 3) {
      return `${userNames[0]}、${userNames[1]}、${userNames[2]}が入力中...`;
    } else {
      return `${userNames[0]}、${userNames[1]}、他${userNames.length - 2}人が入力中...`;
    }
  };

  return (
    <div className={`typing-indicator ${className}`}>
      <div className="typing-indicator__content">
        <div className="typing-indicator__dots">
          <span className="typing-indicator__dot"></span>
          <span className="typing-indicator__dot"></span>
          <span className="typing-indicator__dot"></span>
        </div>
        <span className="typing-indicator__text">
          {getTypingMessage()}
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;