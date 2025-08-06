import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RegisterData } from '../types/auth';
import './AuthPages.css';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData & { confirmPassword: string }>({
    email: '',
    password: '',
    confirmPassword: '',
    givenName: '',
    familyName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }

    // Password validation
    if (formData.password.length < 8) {
      errors.password = 'パスワードは8文字以上である必要があります';
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'パスワードには大文字、小文字、数字を含める必要があります';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      
      // Navigate to confirmation page
      navigate('/confirm-signup', { 
        state: { email: formData.email }
      });
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Registration failed:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>OwlNest アカウント作成</h1>
          <p>新しいアカウントを作成して議論に参加しましょう</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              <p>{error.message}</p>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="givenName">名前（任意）</label>
              <input
                type="text"
                id="givenName"
                name="givenName"
                value={formData.givenName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="太郎"
              />
            </div>

            <div className="form-group">
              <label htmlFor="familyName">姓（任意）</label>
              <input
                type="text"
                id="familyName"
                name="familyName"
                value={formData.familyName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="山田"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">メールアドレス *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className={`form-input ${validationErrors.email ? 'form-input--error' : ''}`}
              placeholder="your@email.com"
            />
            {validationErrors.email && (
              <span className="form-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード *</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className={`form-input ${validationErrors.password ? 'form-input--error' : ''}`}
                placeholder="8文字以上、大文字・小文字・数字を含む"
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
            {validationErrors.password && (
              <span className="form-error">{validationErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">パスワード確認 *</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className={`form-input ${validationErrors.confirmPassword ? 'form-input--error' : ''}`}
                placeholder="パスワードを再入力"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <span className="form-error">{validationErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="auth-button auth-button--primary"
          >
            {isLoading ? 'アカウント作成中...' : 'アカウント作成'}
          </button>
        </form>

        <div className="auth-links">
          <div className="auth-divider">
            <span>すでにアカウントをお持ちですか？</span>
          </div>
          <Link to="/login" className="auth-link">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
};