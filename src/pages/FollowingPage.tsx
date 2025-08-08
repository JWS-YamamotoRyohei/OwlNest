import React from 'react';
import { Helmet } from 'react-helmet-async';
import './FollowingPage.css';

const FollowingPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>フォロー中 - OwlNest</title>
        <meta name="description" content="フォローしているユーザーと議論の管理" />
      </Helmet>

      <div className="following-page">
        <div className="following-page__header">
          <h1>フォロー中</h1>
          <p>フォローしているユーザーと議論の管理</p>
        </div>

        <div className="following-page__content">
          {/* This will be implemented in task 8.1 */}
          <div className="following-page__placeholder">
            <p>フォロー管理機能は実装中です</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default FollowingPage;
