// Authentication modal component
import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ConfirmSignUpForm from './ConfirmSignUpForm';
import './AuthModal.css';

export type AuthModalView = 'login' | 'register' | 'confirm-signup' | 'forgot-password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthModalView;
  onSuccess?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialView = 'login',
  onSuccess,
}) => {
  const [currentView, setCurrentView] = useState<AuthModalView>(initialView);
  const [registrationEmail, setRegistrationEmail] = useState('');

  // Reset view when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentView(initialView);
    }
  }, [isOpen, initialView]);

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  const handleRegistrationSuccess = (userSub: string) => {
    // Switch to confirmation view after successful registration
    setCurrentView('confirm-signup');
  };

  const handleConfirmationSuccess = () => {
    // Switch to login view after successful confirmation
    setCurrentView('login');
  };

  const handleRegisterClick = () => {
    setCurrentView('register');
  };

  const handleLoginClick = () => {
    setCurrentView('login');
  };

  const handleForgotPasswordClick = () => {
    setCurrentView('forgot-password');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="モーダルを閉じる">
          ✕
        </button>

        <div className="auth-modal-body">
          {currentView === 'login' && (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToRegister={handleRegisterClick}
              onSwitchToForgotPassword={handleForgotPasswordClick}
            />
          )}

          {currentView === 'register' && (
            <RegisterForm
              onSuccess={userSub => {
                handleRegistrationSuccess(userSub);
              }}
              onSwitchToLogin={handleLoginClick}
            />
          )}

          {currentView === 'confirm-signup' && (
            <ConfirmSignUpForm
              email={registrationEmail}
              onSuccess={handleConfirmationSuccess}
              onSwitchToLogin={handleLoginClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
