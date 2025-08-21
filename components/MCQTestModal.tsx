import React, { useState, useEffect, useCallback } from 'react';
import { MCQ, Resource } from '../types';
import { generateMCQs } from '../services/geminiService';
import Spinner from './Spinner';
import { XIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the PDF.js worker. This is required for the library to work.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;


interface MCQTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
}

type QuizState = 'loading' | 'active' | 'results' | 'error';
type LoadingStage = 'Parsing PDF...' | 'Generating quiz...' | '';


/**
 * Fetches a PDF from a URL and extracts its text content.
 * @param pdfUrl The URL of the PDF file.
 * @returns A promise that resolves with the extracted text.
 */
const extractTextFromPdf = async (pdfUrl: string): Promise<string> => {
    // Use a reliable proxy to bypass potential CORS issues.
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(pdfUrl)}`;
    
    const loadingTask = pdfjsLib.getDocument(proxyUrl);
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
};


const MCQTestModal: React.FC<MCQTestModalProps> = ({ isOpen, onClose, resource }) => {
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('');
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [finalAnswers, setFinalAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState(0);

  const loadQuiz = useCallback(async () => {
    setQuizState('loading');
    setError(null);
    setUserAnswers({});
    setFinalAnswers({});
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    
    try {
      setLoadingStage('Parsing PDF...');
      const pdfText = await extractTextFromPdf(resource.pdf_link);

      if (!pdfText || pdfText.trim().length < 200) {
        throw new Error("Could not extract enough text from the PDF to generate a quiz. The file might be empty, corrupted, or an image-based PDF.");
      }

      setLoadingStage('Generating quiz...');
      const questions = await generateMCQs(pdfText);

      if (questions.length === 0) {
        throw new Error("The AI couldn't generate questions for this topic. Please try another one.");
      }
      setMcqs(questions);
      setQuizState('active');
    } catch (err: any) {
      console.error("Quiz generation failed:", err);
      setError(err.message || 'An unknown error occurred.');
      setQuizState('error');
    } finally {
      setLoadingStage('');
    }
  }, [resource]);

  useEffect(() => {
    if (isOpen) {
      loadQuiz();
    }
  }, [isOpen, loadQuiz]);

  const handleNextQuestion = () => {
    if (selectedOption) {
      setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedOption }));
    }

    if (currentQuestionIndex < mcqs.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(userAnswers[currentQuestionIndex + 1] || null);
    } else {
      const answers = { ...userAnswers, [currentQuestionIndex]: selectedOption };
      setFinalAnswers(answers);
      let finalScore = 0;
      mcqs.forEach((mcq, index) => {
        if (answers[index] === mcq.correctAnswer) {
          finalScore++;
        }
      });
      setScore(finalScore);
      setQuizState('results');
    }
  };
  
  const getOptionClass = (option: string) => {
    return selectedOption === option
        ? 'bg-primary/30 border-primary text-primary'
        : 'bg-surface hover:bg-slate-600 border-border-color';
  };

  if (!isOpen) return null;

  const currentQuestion = mcqs[currentQuestionIndex];

  return (
    <div 
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      aria-modal="true" 
      role="dialog"
    >
      <div 
        className="bg-background border border-border-color rounded-lg shadow-2xl w-full max-w-3xl transform transition-all duration-300 animate-fade-in-up flex flex-col overflow-hidden"
        style={{minHeight: '400px', maxHeight: '90vh'}}
      >
        <header className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary">Quiz: {resource.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-600"><XIcon className="h-6 w-6" /></button>
        </header>

        <main className="flex-grow p-6 overflow-y-auto overscroll-y-contain">
          {quizState === 'loading' && <Spinner text={loadingStage} />}
          {quizState === 'error' && <div className="text-center text-red-400 p-8 flex flex-col items-center justify-center h-full"><p className="font-bold mb-2">Quiz Generation Failed</p><p className="text-sm">{error}</p></div>}
          
          {quizState === 'results' && (
             <div className="flex flex-col h-full">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-text-primary">Quiz Complete!</h3>
                    <p className="text-5xl font-extrabold text-primary my-2">{score} / {mcqs.length}</p>
                    <p className="text-lg text-text-secondary">You answered {score} questions correctly.</p>
                </div>
                 <h4 className="text-xl font-bold text-text-primary mb-4 border-b border-border-color pb-2">Review Your Answers</h4>
                <div className="space-y-6 overflow-y-auto scrollbar-thin pr-2 flex-grow">
                    {mcqs.map((mcq, index) => {
                        const userAnswer = finalAnswers[index];
                        const isCorrect = userAnswer === mcq.correctAnswer;
                        return (
                            <div key={index} className="border-l-4 pl-4 " style={{borderColor: isCorrect ? '#22D3EE' : '#EC4899'}}>
                                <div className="flex items-start gap-2">
                                     {isCorrect ? <CheckCircleIcon className="h-6 w-6 text-primary flex-shrink-0 mt-1" /> : <XCircleIcon className="h-6 w-6 text-secondary flex-shrink-0 mt-1" />}
                                    <h5 className="text-md font-semibold text-text-primary">{index + 1}. {mcq.question}</h5>
                                </div>
                                <div className="pl-8 mt-3 space-y-2 text-sm">
                                    {mcq.options.map((option, i) => {
                                        const isCorrectAnswer = option === mcq.correctAnswer;
                                        const isUserAnswer = option === userAnswer;
                                        let optionClass = 'text-text-secondary';
                                        if(isCorrectAnswer) optionClass = 'text-primary font-bold';
                                        else if(isUserAnswer && !isCorrect) optionClass = 'text-secondary line-through';
                                        return <p key={i} className={optionClass}>{option}</p>;
                                    })}
                                </div>
                                {!isCorrect && <p className="text-xs text-text-secondary mt-2 pl-8">Your answer: <span className="text-secondary">{userAnswer || 'No answer'}</span></p>}
                            </div>
                        );
                    })}
                </div>
            </div>
          )}

          {quizState === 'active' && currentQuestion && (
            <div>
              <p className="text-sm font-semibold text-text-secondary mb-2">Question {currentQuestionIndex + 1} of {mcqs.length}</p>
              <h4 className="text-xl font-semibold text-text-primary mb-6">{currentQuestion.question}</h4>
              <div className="space-y-3">
                {currentQuestion.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${getOptionClass(option)}`}
                  >
                    <span className="font-medium">{option}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>

        <footer className="p-4 border-t border-border-color flex-shrink-0 flex justify-between items-center">
            {quizState === 'results' ? (
                 <div className="flex gap-4">
                     <button onClick={loadQuiz} className="bg-primary text-background font-bold py-2 px-6 rounded-md hover:bg-cyan-400 transition">Try Again</button>
                     <button onClick={onClose} className="bg-slate-600 text-text-primary font-bold py-2 px-6 rounded-md hover:bg-slate-500 transition">Close</button>
                 </div>
            ) : quizState === 'active' ? (
                <button
                onClick={handleNextQuestion}
                disabled={!selectedOption}
                className="bg-primary text-background font-bold py-2 px-8 rounded-md hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                {currentQuestionIndex < mcqs.length - 1 ? 'Next' : 'Finish'}
                </button>
            ) : ( <div></div> )}
        </footer>
      </div>
    </div>
  );
};

export default MCQTestModal;