import React, { useState, useEffect } from 'react';
import { FollowTargetType } from '../../types';
import { useFollow } from '../../contexts/FollowContext';
import './FollowButton.css';

interface FollowButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  targetName?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  showText?: boolean;
  disabled?: boolean;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  targetType,
  targetId,
  targetName,
  size = 'medium',
  variant = 'primary',
  showText = true,
  disabled = false,
  className = '',
  onFollowChange,
}) => {
  const { state, follow, unfollow, getFollowStatus } = useFollow();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check follow status
  useEffect(() => {
    const followStatus = getFollowStatus(targetType, targetId);
    setIsFollowing(followStatus);
  }, [targetType, targetId, getFollowStatus, state.followingUsers, state.followingDiscussions]);

  // Handle follow/unfollow
  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollow(targetType, targetId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await follow({
          targetType,
          targetId,
          notificationsEnabled: true,
        });
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('Follow operation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get button text
  const getButtonText = () => {
    if (!showText) return '';
    
    if (isLoading) {
      return isFollowing ? 'フォロー解除中...' : 'フォロー中...';
    }
    
    if (isFollowing) {
      return targetType === FollowTargetType.USER ? 'フォロー中' : 'フォロー中';
    }
    
    return targetType === FollowTargetType.USER ? 'フォロー' : 'フォロー';
  };

  // Get button icon
  const getButtonIcon = () => {
    if (isLoading) {
      return (
        <svg className="follow-button__spinner" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="32"
            strokeDashoffset="32"
          />
        </svg>
      );
    }
    
    if (isFollowing) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      );
    }
    
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    );
  };

  const buttonClasses = [
    'follow-button',
    `follow-button--${size}`,
    `follow-button--${variant}`,
    isFollowing ? 'follow-button--following' : 'follow-button--not-following',
    isLoading ? 'follow-button--loading' : '',
    disabled ? 'follow-button--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || isLoading}
      title={
        isFollowing
          ? `${targetName || ''}のフォローを解除`
          : `${targetName || ''}をフォロー`
      }
      aria-label={
        isFollowing
          ? `${targetName || ''}のフォローを解除`
          : `${targetName || ''}をフォロー`
      }
    >
      <span className="follow-button__icon">
        {getButtonIcon()}
      </span>
      {showText && (
        <span className="follow-button__text">
          {getButtonText()}
        </span>
      )}
    </button>
  );
};