import React from 'react';
import { Stance } from '../../types/common';
import './StanceSelector.css';

interface StanceSelectorProps {
  value: Stance;
  onChange: (stance: Stance) => void;
  error?: string;
  showDefault?: boolean;
  disabled?: boolean;
}

const STANCE_OPTIONS = [
  {
    value: Stance.PROS,
    label: '賛成',
    description: 'この論点に賛成する立場',
    color: '#22c55e',
    icon: '👍',
  },
  {
    value: Stance.CONS,
    label: '反対',
    description: 'この論点に反対する立場',
    color: '#ef4444',
    icon: '👎',
  },
  {
    value: Stance.NEUTRAL,
    label: '中立',
    description: 'どちらでもない中立的な立場',
    color: '#64748b',
    icon: '🤝',
  },
  {
    value: Stance.UNKNOWN,
    label: 'わからない',
    description: '判断がつかない、または情報不足',
    color: '#a855f7',
    icon: '🤔',
  },
  {
    value: Stance.HIDDEN,
    label: '非表示',
    description: 'スタンスを公開しない',
    color: '#6b7280',
    icon: '🔒',
  },
];

export const StanceSelector: React.FC<StanceSelectorProps> = ({
  value,
  onChange,
  error,
  showDefault = false,
  disabled = false,
}) => {
  const handleStanceChange = (stance: Stance) => {
    if (!disabled) {
      onChange(stance);
    }
  };

  return (
    <div className={`stance-selector ${error ? 'stance-selector--error' : ''}`}>
      <div className="stance-selector__options">
        {STANCE_OPTIONS.map(option => (
          <div
            key={option.value}
            className={`stance-selector__option ${
              value === option.value ? 'stance-selector__option--selected' : ''
            } ${disabled ? 'stance-selector__option--disabled' : ''}`}
            onClick={() => handleStanceChange(option.value)}
            style={
              {
                '--stance-color': option.color,
              } as React.CSSProperties
            }
          >
            <div className="stance-selector__option-icon">{option.icon}</div>
            <div className="stance-selector__option-content">
              <div className="stance-selector__option-label">
                {option.label}
                {showDefault && option.value === Stance.UNKNOWN && (
                  <span className="stance-selector__default-badge">デフォルト</span>
                )}
              </div>
              <div className="stance-selector__option-description">{option.description}</div>
            </div>
            <div className="stance-selector__option-radio">
              <input
                type="radio"
                name="stance"
                value={option.value}
                checked={value === option.value}
                onChange={() => handleStanceChange(option.value)}
                disabled={disabled}
                tabIndex={-1}
              />
            </div>
          </div>
        ))}
      </div>

      {showDefault && (
        <div className="stance-selector__help">
          <div className="stance-selector__help-icon">💡</div>
          <div className="stance-selector__help-text">
            過去に同じ議論で投稿したことがある場合、最後のスタンスがデフォルトで選択されます。
          </div>
        </div>
      )}
    </div>
  );
};
