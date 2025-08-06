import React from 'react';
import { Helmet } from 'react-helmet-async';
import './MyDiscussionsPage.css';

const MyDiscussionsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>自分の議論 - OwlNest</title>
        <meta name="description" content="あなたが作成した議論の管理" />
      </Helmet>
      
      <div className="my-discussions-page">
        <div className="my-discussions-page__header">
          <h1>自分の議論</h1>
          <p>あなたが作成した議論の管理</p>
        </div>
        
        <div className="my-discussions-page__content">
          {/* This will be implemented in task 7.2 */}
          <div className="my-discussions-page__placeholder">
            <p>自分の議論管理機能は実装中です</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MyDiscussionsPage;