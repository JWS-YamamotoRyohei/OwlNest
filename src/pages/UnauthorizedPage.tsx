import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ErrorPages.css';

export const UnauthorizedPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="error-page">
      <div className="error-container">
        <div className="error-icon">
          🚫
        </div>
        
        <h1 className="error-title">アクセス権限がありません</h1>
        
        <p className="error-message">
          このページにアクセスするための権限がありません。
        </p>

        {isAuthenticated && user && (
          <div className="error-details">
            <p>現在のユーザー権限: <strong>{user.role}</strong></p>
            <p>
              より高い権限が必要な場合は、管理者にお問い合わせください。
            </p>
          </div>
        )}

        {!isAuthenticated && (
          <div className="error-details">
            <p>このページにアクセスするにはログインが必要です。</p>
          </div>
        )}

        <div className="error-actions">
          <button 
            onClick={handleGoBack}
            className="error-button error-button--secondary"
          >
            前のページに戻る
          </button>
          
          {isAuthenticated ? (
            <Link 
              to="/discussions" 
              className="error-button error-button--primary"
            >
              議論一覧に戻る
            </Link>
          ) : (
            <Link 
              to="/login" 
              className="error-button error-button--primary"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};