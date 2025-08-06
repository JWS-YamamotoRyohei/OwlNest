import React from 'react';
import { Helmet } from 'react-helmet-async';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>設定 - OwlNest</title>
        <meta name="description" content="アカウント設定と環境設定" />
      </Helmet>
      
      <div className="settings-page">
        <div className="settings-page__header">
          <h1>設定</h1>
          <p>アカウント設定と環境設定</p>
        </div>
        
        <div className="settings-page__content">
          {/* This will be implemented later */}
          <div className="settings-page__placeholder">
            <p>設定機能は実装中です</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;