// Confirm sign up form component
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './AuthForms.css';

interface ConfirmSignUpFormProps {
  email: string;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const ConfirmSignUpForm: React.FC<ConfirmSignUpFormProps> = ({
  email,
  onSuccess,
  onSwitchToLogin,
}) => {
  const { confirmSignUp, resendConfirmationCode, isLoading, error, clearError } = useAuth();
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setConfirmationCode(value);

    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmationCode || confirmationCode.length !== 6) {
      return;
    }

    try {
      await confirmSignUp({ email, confirmationCode });
      onSuccess?.();
    } catch (error) {
      // Error is handled by the context
      console.error('Confirmation failed:', error);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setResendMessage('');

    try {
      await resendConfirmationCode(email);
      setResendMessage('確認コードを再送信しました。メールをご確認ください。');
    } catch (error) {
      console.error('Resend failed:', error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <h2>メールアドレスの確認</h2>
        <p>
          <strong>{email}</strong> に送信された確認コードを入力してください
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form-content">
        {error && (
          <div className="auth-error">
            <span className="error-icon">⚠️</span>
            <span>{error.message}</span>
          </div>
        )}

        {resendMessage && (
          <div className="auth-success">
            <span className="success-icon">✅</span>
            <span>{resendMessage}</span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="confirmationCode">確認コード</label>
          <input
            type="text"
            id="confirmationCode"
            name="confirmationCode"
            value={confirmationCode}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            placeholder="123456"
            maxLength={6}
            pattern="\d{6}"
            className="confirmation-code-input"
            autoComplete="one-time-code"
          />
          <div className="field-help">6桁の数字を入力してください</div>
        </div>

        <button
          type="submit"
          className="auth-submit-button"
          disabled={isLoading || confirmationCode.length !== 6}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner"></span>
              確認中...
            </>
          ) : (
            'メールアドレスを確認'
          )}
        </button>

        <div className="auth-form-links">
          <span>確認コードが届かない場合は</span>
          <button
            type="button"
            className="link-button"
            onClick={handleResendCode}
            disabled={isLoading || isResending}
          >
            {isResending ? '再送信中...' : '確認コードを再送信'}
          </button>
        </div>

        <div className="auth-form-divider">
          <span>または</span>
        </div>

        <div className="auth-form-links">
          <button
            type="button"
            className="link-button primary"
            onClick={onSwitchToLogin}
            disabled={isLoading}
          >
            ログインページに戻る
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConfirmSignUpForm;
