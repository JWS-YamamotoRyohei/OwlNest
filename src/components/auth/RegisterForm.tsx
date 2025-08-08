// Register form component
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { RegisterData } from '../../types/auth';
import './AuthForms.css';

interface RegisterFormProps {
  onSuccess?: (userSub: string) => void;
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    givenName: '',
    familyName: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('8文字以上である必要があります');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('小文字を含む必要があります');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('大文字を含む必要があります');
    }
    if (!/\d/.test(password)) {
      errors.push('数字を含む必要があります');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('記号を含む必要があります');
    }

    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'password') {
      setFormData(prev => ({ ...prev, [name]: value }));
      setPasswordErrors(validatePassword(value));
    } else if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

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

    if (formData.password !== confirmPassword) {
      return;
    }

    if (passwordErrors.length > 0) {
      return;
    }

    try {
      const result = await register(formData);
      onSuccess?.(result.userSub);
    } catch (error) {
      // Error is handled by the context
      console.error('Registration failed:', error);
    }
  };

  const isFormValid = () => {
    return (
      formData.email &&
      formData.password &&
      confirmPassword &&
      formData.password === confirmPassword &&
      passwordErrors.length === 0
    );
  };

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <h2>新規登録</h2>
        <p>OwlNestアカウントを作成してください</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form-content">
        {error && (
          <div className="auth-error">
            <span className="error-icon">⚠️</span>
            <span>{error.message}</span>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="givenName">名前（任意）</label>
            <input
              type="text"
              id="givenName"
              name="givenName"
              value={formData.givenName || ''}
              onChange={handleInputChange}
              disabled={isLoading}
              placeholder="太郎"
              autoComplete="given-name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="familyName">姓（任意）</label>
            <input
              type="text"
              id="familyName"
              name="familyName"
              value={formData.familyName || ''}
              onChange={handleInputChange}
              disabled={isLoading}
              placeholder="山田"
              autoComplete="family-name"
            />
          </div>
        </div>

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
              autoComplete="new-password"
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
          {passwordErrors.length > 0 && (
            <div className="password-requirements">
              <p>パスワードの要件:</p>
              <ul>
                {passwordErrors.map((error, index) => (
                  <li key={index} className="requirement-error">
                    ❌ {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">パスワード確認</label>
          <div className="password-input-container">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              placeholder="パスワードを再入力"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              aria-label={showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            >
              {showConfirmPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {confirmPassword && formData.password !== confirmPassword && (
            <div className="field-error">パスワードが一致しません</div>
          )}
        </div>

        <button type="submit" className="auth-submit-button" disabled={isLoading || !isFormValid()}>
          {isLoading ? (
            <>
              <span className="loading-spinner"></span>
              登録中...
            </>
          ) : (
            'アカウント作成'
          )}
        </button>

        <div className="auth-form-divider">
          <span>または</span>
        </div>

        <div className="auth-form-links">
          <span>既にアカウントをお持ちの方は</span>
          <button
            type="button"
            className="link-button primary"
            onClick={onSwitchToLogin}
            disabled={isLoading}
          >
            ログイン
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;
