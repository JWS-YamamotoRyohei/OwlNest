import { FC, CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Post } from '../types/post';

type Props = { post: Post };

export const SortableTile: FC<Props> = ({ post }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: post.id });

  const style: CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: '0.2rem',
    boxShadow: '0 1px 2px rgba(0,0,0,.05)',
    padding: '0.25rem',
    marginBottom: '0.1rem',
    marginTop: '0.1rem',
    marginRight: post.stance === 'pros' ? '0.5rem' : '0rem',
    marginLeft: post.stance === 'cons' ? '0.5rem' : '0rem',
    cursor: 'grab',
    userSelect: 'none',
    width: '100%',
    fontSize: '0.6rem',
    backgroundColor: post.stance === 'pros' ? '#E0F7FA' : '#FFEBEE',
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
      <div style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>{post.text}</div>
    </div>
  );
};
