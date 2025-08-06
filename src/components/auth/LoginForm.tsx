// Login form component
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoginCredentials } from '../../types/auth';
import './AuthForms.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onSwitchToForgotPassword?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
}) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await login(formData);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the context
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <h2>ログイン</h2>
        <p>OwlNestアカウントでログインしてください</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form-content">
        {error && (
          <div className="auth-error">
            <span className="error-icon">⚠️</span>
            <span>{error.message}</span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">メールアドレス</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            placeholder="example@email.com"
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">パスワード</label>
          <div className="password-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              placeholder="パスワードを入力"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="auth-submit-button"
          disabled={isLoading || !formData.email || !formData.password}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner"></span>
              ログイン中...
            </>
          ) : (
            'ログイン'
          )}
        </button>

        <div className="auth-form-links">
          <button
            type="button"
            className="link-button"
            onClick={onSwitchToForgotPassword}
            disabled={isLoading}
          >
            パスワードを忘れた方
          </button>
        </div>

        <div className="auth-form-divider">
          <span>または</span>
        </div>

        <div className="auth-form-links">
          <span>アカウントをお持ちでない方は</span>
          <button
            type="button"
            className="link-button primary"
            onClick={onSwitchToRegister}
            disabled={isLoading}
          >
            新規登録
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;