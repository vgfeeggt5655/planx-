import React from 'react';

interface SpinnerProps {
    text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ text = 'Loading...' }) => {
  // If text is an empty string, render a compact version for buttons
  const isCompact = text === '';

  return (
    <div className={`flex items-center justify-center ${isCompact ? 'gap-2 h-5' : 'flex-col gap-4 my-8'}`}>
      <div className={`flex items-center justify-center ${isCompact ? 'space-x-1.5' : 'space-x-2'}`}>
        <div className={`${isCompact ? 'w-2 h-2' : 'w-3 h-3'} bg-primary rounded-full animate-bounce`} style={{ animationDelay: '-0.3s' }}></div>
        <div className={`${isCompact ? 'w-2 h-2' : 'w-3 h-3'} bg-primary rounded-full animate-bounce`} style={{ animationDelay: '-0.15s' }}></div>
        <div className={`${isCompact ? 'w-2 h-2' : 'w-3 h-3'} bg-primary rounded-full animate-bounce`}></div>
      </div>
      {!isCompact && <p className="text-lg text-text-primary font-medium">{text}</p>}
    </div>
  );
};

export default Spinner;