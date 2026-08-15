import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Carregando...',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800" />
        <div className="absolute inset-0 rounded-full border-4 border-t-[#0071e3] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
      {message && (
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center w-full">
        {content}
      </div>
    );
  }

  return content;
};
