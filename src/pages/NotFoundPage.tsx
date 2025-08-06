import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ErrorPages.css';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="error-page">
      <div className="error-container">
        <div className="error-icon">
          🦉
        </div>
        
        <h1 className="error-title">ページが見つかりません</h1>
        
        <p className="error-message">
          お探しのページは存在しないか、移動された可能性があります。
        </p>

        <div className="error-details">
          <p>
            URLを確認するか、以下のリンクから他のページにアクセスしてください。
          </p>
        </div>

        <div className="error-actions">
          <button 
            onClick={handleGoBack}
            className="error-button error-button--secondary"
          >
            前のページに戻る
          </button>
          
          <Link 
            to="/discussions" 
            className="error-button error-button--primary"
          >
            議論一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
};