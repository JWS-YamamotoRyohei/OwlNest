// Follow and timeline related types

import { User } from './auth';
import { Discussion } from './discussion';

export interface Follow {
  followerId: string;
  targetType: 'USER' | 'DISCUSSION';
  targetId: string;
  createdAt: string;
}

export interface TimelineItem {
  id: string;
  userId: string;
  itemType: 'POST' | 'DISCUSSION';
  itemId: string;
  authorId: string;
  title: string;
  preview: string;
  createdAt: string;
}

export interface FollowContextType {
  followedUsers: User[];
  followedDiscussions: Discussion[];
  timeline: TimelineItem[];
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  followDiscussion: (discussionId: string) => Promise<void>;
  unfollowDiscussion: (discussionId: string) => Promise<void>;
  loadTimeline: () => Promise<void>;
}