import React from 'react';
import { Subject } from '../types';

interface SubjectSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  selectedSubject: string;
  onSelectSubject: (subjectName: string) => void;
}

const SubjectSelectionDialog: React.FC<SubjectSelectionDialogProps> = ({
  isOpen,
  onClose,
  subjects,
  selectedSubject,
  onSelectSubject,
}) => {
  if (!isOpen) return null;

  const handleSelect = (subjectName: string) => {
    onSelectSubject(subjectName);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-color rounded-lg shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s forwards' }}
      >
        <h2 className="text-xl font-bold text-text-primary mb-6 text-center">Select a Subject</h2>

        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-2 overscroll-y-contain">
          {subjects.length === 0 ? (
             <p className="text-center text-text-secondary py-4">No subjects available. Please add one in the dashboard.</p>
          ) : (
            subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => handleSelect(subject.Subject_Name)}
                className={`w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  selectedSubject === subject.Subject_Name
                    ? 'bg-primary text-background shadow'
                    : 'bg-slate-700 text-text-primary hover:bg-slate-600'
                }`}
              >
                {subject.Subject_Name}
              </button>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-text-primary rounded-md hover:bg-slate-500 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Cancel
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default SubjectSelectionDialog;