
export interface Resource {
  id: string;
  title: string;
  Subject_Name: string;
  video_link: string;
  pdf_link: string;
  image_url: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  // WARNING: Storing plain-text passwords is a major security risk.
  // This is implemented based on the requested Google Sheets structure.
  // In a real application, always use a secure authentication provider and password hashing.
  password: string;
  role: 'user' | 'admin' | 'super_admin';
  avatar?: string;
  watched?: string; // JSON string like '{"resourceId": seconds}'
}

export interface Subject {
  id: string;
  Subject_Name: string;
  number: number;
}

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Flashcard {
  front: string;
  back: string;
}
