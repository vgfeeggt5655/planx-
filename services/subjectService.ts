
import { Subject } from '../types';

const API_URL = 'https://script.google.com/macros/s/AKfycby23phjhXwfM8N_5YTgQsKGehhPp7Tw3pa-KFHt1O0IWlKqmIUZv2lekltLhOe-OjeVMg/exec';

export const getSubjects = async (): Promise<Subject[]> => {
  // App Script needs a parameter to know what action to perform.
  const response = await fetch(`${API_URL}?action=get`);
  if (!response.ok) {
    throw new Error('Failed to fetch subjects');
  }
  const data = await response.json();
  // Ensure every subject has an order property, default to 0 if missing
  const subjects = data.data || [];
  return subjects.map((s: any, index: number) => ({
    ...s,
    id: String(s.id),
    number: s.number !== undefined && s.number !== null ? Number(s.number) : index
  }));
};

export const addSubject = async (subjectName: string): Promise<void> => {
  const formData = new FormData();
  formData.append('action', 'create');
  formData.append('Subject_Name', subjectName);

  await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors', // Use no-cors for simple POST requests to Google App Scripts
    body: formData,
  });
};

export const updateSubject = async (id: string, subjectName: string, number?: number): Promise<void> => {
    const formData = new FormData();
    formData.append('action', 'update');
    formData.append('id', id);
    formData.append('Subject_Name', subjectName);
    if (number !== undefined) {
        formData.append('number', String(number));
    }

    await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    });
};


export const deleteSubject = async (id: string): Promise<void> => {
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id', id);

    await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    });
};