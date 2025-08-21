import React from 'react';

interface ProgressBarProps {
  progress: number;
  text: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, text }) => {
  return (
    <div className="w-full my-8">
      <p className="text-lg text-text-primary font-medium text-center mb-2">{text}</p>
      <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner border border-border-color">
        <div
          className="bg-gradient-to-r from-primary to-cyan-400 h-4 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;