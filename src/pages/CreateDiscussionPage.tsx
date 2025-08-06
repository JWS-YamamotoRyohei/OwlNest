import React from 'react';
import { Helmet } from 'react-helmet-async';
import './CreateDiscussionPage.css';

const CreateDiscussionPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>議論を作成 - OwlNest</title>
        <meta name="description" content="新しい議論トピックを作成しましょう" />
      </Helmet>
      
      <div className="create-discussion-page">
        <div className="create-discussion-page__header">
          <h1>議論を作成</h1>
          <p>新しい議論トピックを作成しましょう</p>
        </div>
        
        <div className="create-discussion-page__content">
          {/* This will be implemented in task 4.2 */}
          <div className="create-discussion-page__placeholder">
            <p>議論作成フォームは実装中です</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateDiscussionPage;