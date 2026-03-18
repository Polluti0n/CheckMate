import React, { useEffect, useState } from 'react';
import { ToastData, UserProfile, NotificationData, AlertType } from '../types';
import { UserCircleIcon, ToastCloseIcon, alertStyles } from './icons';

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
  autoDismissTime?: number;
  alertType?: AlertType;
  iconSvg?: React.ReactNode;
}

const Toast: React.FC<ToastProps> = ({
  id,
  userProfile,
  notification,
  handleToastClick,
  onDismiss,
  autoDismissTime = 5000,
  alertType,
  iconSvg,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismissal timer
  useEffect(() => {
    const autoDismissTimer = setTimeout(() => {
      setIsExiting(true);
    }, autoDismissTime);

    return () => clearTimeout(autoDismissTimer);
  }, [autoDismissTime]);

  // Effect for handling the actual dismissal after the exit animation
  useEffect(() => {
    if (isExiting) {
      const exitAnimationDuration = 600; // Matches the duration for slide-out-right in CSS + a small buffer
      const exitTimer = setTimeout(() => {
        onDismiss(id);
      }, exitAnimationDuration);

      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, id, onDismiss]);

  const handleClose = () => {
    setIsExiting(true);
  };

  const isAlert = !!alertType;
  const alertConfig = isAlert && alertType ? alertStyles[alertType] : undefined;

  const displayName = userProfile?.firstName || userProfile?.lastName || userProfile?.email || 'Anonymous';
  const fullName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim();

  let displayedMessage: React.ReactNode;
  if (isAlert) {
    displayedMessage = notification.message;
  } else {
    const messageBody = notification.message.replace(fullName, '').trim();
    displayedMessage = (
      <>
        <span className="text-sm font-medium text-slate-800 pr-1">{displayName}</span>
        {messageBody}
      </>
    );
  }

  const animationClasses = `
    transition-all duration-500 ease-in-out
    ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
  `;

  return (
    <div
      className={`relative w-80 max-w-sm rounded-xl shadow-2xl p-4 border 
          ${animationClasses}
          ${isAlert
          ? `${alertConfig?.bgColor} ${alertConfig?.textColor} border-transparent`
          : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700'
        }
        `}
    >
      <div className="flex items-start gap-3">
        {/* 1. Icon/Image Section */}
        <div className="flex-shrink-0">
          {isAlert ? (
            iconSvg || alertConfig?.icon({ className: `h-6 w-6 ${alertConfig?.iconColor || 'text-current'}` })
          ) : (
            userProfile?.profilePictureUrl ? (
              <img src={userProfile.profilePictureUrl} alt={userProfile.firstName || ''} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <UserCircleIcon className="h-10 w-10 text-slate-400 dark:text-gray-500" />
            )
          )}
        </div>

        {/* 2. Message Section */}
        <div className="flex-1 cursor-pointer" onClick={handleToastClick}>
          <p className={`text-sm ${isAlert ? '' : 'text-slate-600 dark:text-gray-300'}`}>
            {isAlert ? (
              displayedMessage
            ) : (
              <>
                <span className="text-sm font-medium text-slate-800 dark:text-white pr-1">{displayName}</span>
                {notification.message.replace(fullName, '').trim()}
              </>
            )}
          </p>
        </div>
        {/* 3. Close Button */}
        <button
          className={`flex-shrink-0 p-1 -mt-1 -mr-1 rounded-full hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-opacity-75
              ${isAlert ? 'text-white hover:bg-white focus:ring-white' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 focus:ring-slate-200'}
            `}
          onClick={handleClose}
          aria-label="Close notification"
        >
          <ToastCloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;