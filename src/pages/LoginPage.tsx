import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginCredentials } from '../types/auth';
import { ENV } from '../constants/environment';
import './AuthPages.css';

export const LoginPage: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/discussions';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(credentials);
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Login failed:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Development mode quick login
  const handleQuickLogin = async (userType: 'user' | 'admin') => {
    clearError();

    const quickCredentials: LoginCredentials = {
      email: userType === 'admin' ? 'admin@example.com' : 'user@example.com',
      password: 'password123',
    };

    try {
      await login(quickCredentials);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Quick login failed:', error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>OwlNest にログイン</h1>
          <p>アカウントにログインして議論に参加しましょう</p>
        </div>

        {/* Development mode quick login */}
        {ENV.ENVIRONMENT === 'development' && (
          <div className="dev-quick-login">
            <h3>🔧 開発環境クイックログイン</h3>
            <div className="quick-login-buttons">
              <button
                type="button"
                onClick={() => handleQuickLogin('user')}
                disabled={isLoading}
                className="auth-button auth-button--secondary"
              >
                👤 一般ユーザーでログイン
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={isLoading}
                className="auth-button auth-button--secondary"
              >
                👑 管理者でログイン
              </button>
            </div>
            <div className="dev-divider">
              <span>または通常ログイン</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              <p>{error.message}</p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleInputChange}
              required
              autoComplete="email"
              className="form-input"
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                autoComplete="current-password"
                className="form-input"
                placeholder="パスワードを入力"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="auth-button auth-button--primary">
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password" className="auth-link">
            パスワードを忘れた方
          </Link>
          <div className="auth-divider">
            <span>または</span>
          </div>
          <Link to="/register" className="auth-link">
            新規アカウント作成
          </Link>
        </div>
      </div>
    </div>
  );
};
