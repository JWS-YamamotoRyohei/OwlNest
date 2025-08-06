import React, { useState, useMemo } from 'react';
import { PostListItem } from '../../types/post';
import { ReactionType } from '../../types/common';
import { PostCard } from './PostCard';
import './PostThread.css';

interface PostThreadProps {
  rootPost: PostListItem;
  replies: PostListItem[];
  onReact?: (postId: string, reactionType: ReactionType) => Promise<void>;
  onReply?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<void>;
  onHide?: (postId: string) => Promise<void>;
  onShow?: (postId: string) => Promise<void>;
  maxLevel?: number;
  showAllReplies?: boolean;
  className?: string;
}

interface ThreadNode {
  post: PostListItem;
  children: ThreadNode[];
  level: number;
}

export const PostThread: React.FC<PostThreadProps> = ({
  rootPost,
  replies,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onHide,
  onShow,
  maxLevel = 3,
  showAllReplies = false,
  className = '',
}) => {
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showAllLevels, setShowAllLevels] = useState(showAllReplies);

  // Build thread tree structure
  const threadTree = useMemo(() => {
    const postMap = new Map<string, PostListItem>();
    const rootNodes: ThreadNode[] = [];

    // Add root post
    postMap.set(rootPost.postId, rootPost);

    // Add all replies to map
    replies.forEach(reply => {
      postMap.set(reply.postId, reply);
    });

    // Build tree structure
    const buildNode = (post: PostListItem, level: number): ThreadNode => {
      const children: ThreadNode[] = [];
      
      // Find direct replies to this post
      replies
        .filter(reply => reply.replyToId === post.postId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .forEach(reply => {
          if (level < maxLevel) {
            children.push(buildNode(reply, level + 1));
          }
        });

      return { post, children, level };
    };

    // Start with root post
    const rootNode = buildNode(rootPost, 0);
    rootNodes.push(rootNode);

    return rootNodes;
  }, [rootPost, replies, maxLevel]);

  // Get flattened list of posts for display
  const flattenedPosts = useMemo(() => {
    const flattened: { post: PostListItem; level: number; hasChildren: boolean }[] = [];

    const flatten = (node: ThreadNode, parentExpanded = true) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedReplies.has(node.post.postId) || showAllLevels;
      
      flattened.push({
        post: node.post,
        level: node.level,
        hasChildren,
      });

      // Add children if expanded and parent is visible
      if (hasChildren && isExpanded && parentExpanded) {
        node.children.forEach(child => {
          flatten(child, true);
        });
      }
    };

    threadTree.forEach(rootNode => {
      flatten(rootNode);
    });

    return flattened;
  }, [threadTree, expandedReplies, showAllLevels]);

  const toggleReplies = (postId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allPostIds = new Set<string>();
    const collectIds = (node: ThreadNode) => {
      allPostIds.add(node.post.postId);
      node.children.forEach(collectIds);
    };
    threadTree.forEach(collectIds);
    setExpandedReplies(allPostIds);
    setShowAllLevels(true);
  };

  const collapseAll = () => {
    setExpandedReplies(new Set());
    setShowAllLevels(false);
  };

  const getTotalReplyCount = (node: ThreadNode): number => {
    let count = node.children.length;
    node.children.forEach(child => {
      count += getTotalReplyCount(child);
    });
    return count;
  };

  const totalReplies = threadTree.reduce((sum, node) => sum + getTotalReplyCount(node), 0);

  return (
    <div className={`post-thread ${className}`}>
      {/* Thread Controls */}
      {totalReplies > 0 && (
        <div className="post-thread__controls">
          <div className="post-thread__stats">
            <span className="post-thread__reply-count">
              {totalReplies}件の返信
            </span>
          </div>
          
          <div className="post-thread__actions">
            <button
              type="button"
              className="post-thread__control-button"
              onClick={expandAll}
            >
              すべて展開
            </button>
            <button
              type="button"
              className="post-thread__control-button"
              onClick={collapseAll}
            >
              すべて折りたたみ
            </button>
          </div>
        </div>
      )}

      {/* Thread Posts */}
      <div className="post-thread__posts">
        {flattenedPosts.map(({ post, level, hasChildren }) => {
          const isExpanded = expandedReplies.has(post.postId) || showAllLevels;
          const isRoot = level === 0;

          return (
            <div key={post.postId} className="post-thread__post-container">
              <PostCard
                post={post}
                onReact={onReact}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onHide={onHide}
                onShow={onShow}
                showActions={true}
                showReplies={true}
                isReply={!isRoot}
                level={level}
                maxLevel={maxLevel}
                className={isRoot ? 'post-thread__root-post' : 'post-thread__reply-post'}
              />

              {/* Reply Toggle Button */}
              {hasChildren && level < maxLevel && (
                <div className="post-thread__reply-toggle">
                  <button
                    type="button"
                    className={`post-thread__toggle-button ${
                      isExpanded ? 'post-thread__toggle-button--expanded' : ''
                    }`}
                    onClick={() => toggleReplies(post.postId)}
                  >
                    <span className="post-thread__toggle-icon">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span className="post-thread__toggle-text">
                      {isExpanded ? '返信を隠す' : `${post.replyCount}件の返信を表示`}
                    </span>
                  </button>
                </div>
              )}

              {/* Max Level Indicator */}
              {hasChildren && level >= maxLevel && (
                <div className="post-thread__max-level-indicator">
                  <div className="post-thread__max-level-message">
                    これ以上深い返信があります。
                    <button
                      type="button"
                      className="post-thread__view-more-button"
                      onClick={() => onReply?.(post.postId)}
                    >
                      続きを見る
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {totalReplies === 0 && (
        <div className="post-thread__empty">
          <div className="post-thread__empty-icon">💬</div>
          <div className="post-thread__empty-message">
            まだ返信がありません
          </div>
          <div className="post-thread__empty-description">
            この投稿に最初の返信をしてみましょう
          </div>
        </div>
      )}
    </div>
  );
};