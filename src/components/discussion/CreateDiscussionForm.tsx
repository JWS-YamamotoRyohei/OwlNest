import React, { useState, useCallback } from 'react';
import {
  CreateDiscussionData,
  CreateDiscussionPointData,
  CreateBackgroundKnowledgeData,
  AccessControl,
} from '../../types/discussion';
import { DiscussionCategory, Stance, AccessControlType } from '../../types/common';
import CategorySelector from './CategorySelector';
import DiscussionPointsEditor from './DiscussionPointsEditor';
import BackgroundKnowledgeEditor from './BackgroundKnowledgeEditor';
import AccessControlEditor from './AccessControlEditor';
import { validateCategorySelection } from '../../constants/categories';
import './CreateDiscussionForm.css';

interface CreateDiscussionFormProps {
  onSubmit: (data: CreateDiscussionData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<CreateDiscussionData>;
}

interface FormErrors {
  title?: string;
  description?: string;
  ownerStance?: string;
  categories?: string;
  points?: string;
  general?: string;
}

export const CreateDiscussionForm: React.FC<CreateDiscussionFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}) => {
  // Form state
  const [formData, setFormData] = useState<CreateDiscussionData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    ownerStance: initialData?.ownerStance || Stance.UNKNOWN,
    categories: initialData?.categories || [],
    points: initialData?.points || [{ title: '', description: '', order: 0 }],
    backgroundKnowledge: initialData?.backgroundKnowledge || [],
    accessControl: initialData?.accessControl || { type: AccessControlType.OPEN, userIds: [] },
    tags: initialData?.tags || [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(0);

  // Form steps
  const steps = [
    { id: 'basic', title: '基本情報', required: true },
    { id: 'categories', title: 'カテゴリ', required: true },
    { id: 'points', title: '論点', required: true },
    { id: 'background', title: '前提知識', required: false },
    { id: 'access', title: 'アクセス制御', required: false },
  ];

  // Validation functions
  const validateBasicInfo = useCallback(() => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '議題は必須です';
    } else if (formData.title.length > 200) {
      newErrors.title = '議題は200文字以内で入力してください';
    }

    if (!formData.description.trim()) {
      newErrors.description = '概要は必須です';
    } else if (formData.description.length > 2000) {
      newErrors.description = '概要は2000文字以内で入力してください';
    }

    return newErrors;
  }, [formData.title, formData.description]);

  const validateCategories = useCallback(() => {
    const validation = validateCategorySelection(formData.categories);
    return validation.isValid ? {} : { categories: validation.errors[0] };
  }, [formData.categories]);

  const validatePoints = useCallback(() => {
    const newErrors: FormErrors = {};

    if (formData.points.length === 0) {
      newErrors.points = '少なくとも1つの論点を追加してください';
    } else {
      const hasValidPoint = formData.points.some(point => point.title.trim());
      if (!hasValidPoint) {
        newErrors.points = '少なくとも1つの論点にタイトルを入力してください';
      }
    }

    return newErrors;
  }, [formData.points]);

  const validateForm = useCallback(() => {
    const basicErrors = validateBasicInfo();
    const categoryErrors = validateCategories();
    const pointErrors = validatePoints();

    return { ...basicErrors, ...categoryErrors, ...pointErrors };
  }, [validateBasicInfo, validateCategories, validatePoints]);

  // Form handlers
  const handleInputChange = (field: keyof CreateDiscussionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear related errors
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStepChange = (step: number) => {
    // Validate current step before moving
    let stepErrors: FormErrors = {};

    switch (currentStep) {
      case 0:
        stepErrors = validateBasicInfo();
        break;
      case 1:
        stepErrors = validateCategories();
        break;
      case 2:
        stepErrors = validatePoints();
        break;
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setCurrentStep(step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      // Filter out empty points and background knowledge
      const cleanedData: CreateDiscussionData = {
        ...formData,
        points: formData.points.filter(point => point.title.trim()),
        backgroundKnowledge: formData.backgroundKnowledge?.filter(bg => bg.content.trim()) || [],
      };

      await onSubmit(cleanedData);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : '議論の作成に失敗しました' });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="form-step">
            <h3>基本情報</h3>

            <div className="form-group">
              <label htmlFor="title" className="form-label">
                議題 <span className="required">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="議論のタイトルを入力してください"
                maxLength={200}
                disabled={isLoading}
              />
              {errors.title && <div className="form-error">{errors.title}</div>}
              <div className="form-help">{formData.title.length}/200 文字</div>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                概要 <span className="required">*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                placeholder="議論の概要や背景を詳しく説明してください"
                rows={6}
                maxLength={2000}
                disabled={isLoading}
              />
              {errors.description && <div className="form-error">{errors.description}</div>}
              <div className="form-help">{formData.description.length}/2000 文字</div>
            </div>

            <div className="form-group">
              <label htmlFor="ownerStance" className="form-label">
                あなたのスタンス <span className="required">*</span>
              </label>
              <select
                id="ownerStance"
                value={formData.ownerStance}
                onChange={e => handleInputChange('ownerStance', e.target.value as Stance)}
                className={`form-select ${errors.ownerStance ? 'error' : ''}`}
                disabled={isLoading}
              >
                <option value={Stance.PROS}>賛成 (Pros)</option>
                <option value={Stance.CONS}>反対 (Cons)</option>
                <option value={Stance.NEUTRAL}>中立</option>
                <option value={Stance.UNKNOWN}>わからない</option>
                <option value={Stance.HIDDEN}>非表示</option>
              </select>
              {errors.ownerStance && <div className="form-error">{errors.ownerStance}</div>}
              <div className="form-help">
                議論に対するあなたの立場を選択してください。後から変更することも可能です。
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="form-step">
            <h3>カテゴリ選択</h3>
            <CategorySelector
              selectedCategories={formData.categories}
              onChange={categories => handleInputChange('categories', categories)}
              maxSelections={5}
              required={true}
              error={errors.categories}
              disabled={isLoading}
            />
          </div>
        );

      case 2:
        return (
          <div className="form-step">
            <h3>議論の論点</h3>
            <DiscussionPointsEditor
              points={formData.points}
              onChange={points => handleInputChange('points', points)}
              error={errors.points}
              disabled={isLoading}
            />
          </div>
        );

      case 3:
        return (
          <div className="form-step">
            <h3>前提知識（任意）</h3>
            <BackgroundKnowledgeEditor
              backgroundKnowledge={formData.backgroundKnowledge || []}
              onChange={bg => handleInputChange('backgroundKnowledge', bg)}
              disabled={isLoading}
            />
          </div>
        );

      case 4:
        return (
          <div className="form-step">
            <h3>アクセス制御（任意）</h3>
            <AccessControlEditor
              accessControl={
                formData.accessControl || { type: AccessControlType.OPEN, userIds: [] }
              }
              onChange={ac => handleInputChange('accessControl', ac)}
              disabled={isLoading}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="create-discussion-form">
      <div className="form-header">
        <h2>新しい議論を作成</h2>
        <p>以下の情報を入力して、新しい議論を開始してください。</p>
      </div>

      {/* Step indicator */}
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`step-item ${index === currentStep ? 'active' : ''} ${
              index < currentStep ? 'completed' : ''
            }`}
            onClick={() => handleStepChange(index)}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              {step.required && <div className="step-required">必須</div>}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        {renderStepContent()}

        {errors.general && <div className="form-error general-error">{errors.general}</div>}

        <div className="form-actions">
          <div className="form-actions-left">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                前へ
              </button>
            )}
          </div>

          <div className="form-actions-right">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-outline"
                disabled={isLoading}
              >
                キャンセル
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => handleStepChange(currentStep + 1)}
                className="btn btn-primary"
                disabled={isLoading}
              >
                次へ
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? '作成中...' : '議論を作成'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateDiscussionForm;
