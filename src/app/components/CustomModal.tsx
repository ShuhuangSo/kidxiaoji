'use client'
import React from 'react';
import ReactDOM from 'react-dom';

interface CustomModalProps {
  show: boolean;
  title: string;
  message: string;
  icon?: React.ReactNode;
  confirmText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  onHide?: () => void;
  type?: string;
  disabled?: boolean;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
}

export default function CustomModal({ 
  show, 
  title, 
  message, 
  icon,
  confirmText = '确定',
  onConfirm,
  onClose,
  onHide,
  type,
  disabled = false,
  secondaryButtonText,
  onSecondaryButtonClick
}: CustomModalProps) {
  // 避免在模态框不显示时执行不必要的渲染
  if (!show) return null;

  // 恢复原始类型判断，区分成功、错误、警告和信息四种类型
  const isSuccess = (type && type.toLowerCase() === 'success') || 
                    (title && title.includes('成功')) ||
                    (message && (message.includes('成功') || message.includes('等待管理员审核')));
  const isError = (type && type.toLowerCase() === 'error') || 
                  (title && title.includes('失败')) ||
                  (message && message.includes('失败'));
  const isWarning = (type && type.toLowerCase() === 'warning');
  // 默认为信息类型

  // 为每种类型设置正确的样式
  let headerClass = 'bg-blue-50 border-blue-200 text-blue-700'; // 默认信息样式
  let buttonClass = 'bg-blue-500 hover:bg-blue-600 text-white rounded px-6 py-2'; // 信息按钮样式
  let iconContainerClass = 'bg-blue-50 border-blue-200 text-blue-700';
  let displayTitle = title;

  if (isSuccess) {
    headerClass = 'bg-green-50 border-green-200 text-green-700';
    buttonClass = 'bg-green-500 text-white rounded px-6 py-2'; // 保持确认按钮绿色
    iconContainerClass = 'bg-green-50 border-green-200 text-green-700';
    displayTitle = '操作成功';
  } else if (isError) {
    headerClass = 'bg-red-50 border-red-200 text-red-700';
    buttonClass = 'bg-red-500 hover:bg-red-600 text-white rounded px-6 py-2'; // 错误按钮样式
    iconContainerClass = 'bg-red-50 border-red-200 text-red-700';
  } else if (isWarning) {
    headerClass = 'bg-yellow-50 border-yellow-200 text-yellow-700';
    buttonClass = 'bg-yellow-500 hover:bg-yellow-600 text-white rounded px-6 py-2'; // 警告按钮样式
    iconContainerClass = 'bg-yellow-50 border-yellow-200 text-yellow-700';
  }

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    // 同时尝试调用onHide和onClose，确保弹窗能被关闭
    if (onHide) onHide();
    if (onClose) onClose();
  };

  const handleClose = () => {
    // 同时尝试调用onHide和onClose，确保弹窗能被关闭
    if (onHide) onHide();
    if (onClose) onClose();
  };

  // 点击背景关闭模态框
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // 使用React Portal将模态框渲染到body的末尾
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30 transition-opacity duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-300 animate-fade-in-up">
        {/* 模态框头部 */}
        <div className={`${headerClass} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{displayTitle}</h3>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="关闭"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* 模态框内容 */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-center mb-4">
            {icon || (
              <div className={`w-16 h-16 flex items-center justify-center rounded-full ${iconContainerClass} mb-2`}>
                {isSuccess ? (
                  // 成功图标 - 打勾
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : isError ? (
                  // 错误图标 - X号
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : isWarning ? (
                  // 警告图标 - 感叹号
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  // 信息图标
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            )}
          </div>
          <p className="text-center text-gray-600 mb-2">{message}</p>
        </div>

        {/* 模态框底部 */}
        <div className="px-6 py-4 bg-gray-50 flex justify-center gap-4">
          {secondaryButtonText && onSecondaryButtonClick && (
            <button
              onClick={onSecondaryButtonClick}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-6 py-2"
            >
              {secondaryButtonText}
            </button>
          )}
          <button
            onClick={disabled ? undefined : handleConfirm}
            disabled={disabled}
            className={`${buttonClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 添加动画样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .animate-fade-in-up {
      animation: fadeInUp 0.3s ease-out;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(styleElement);
}