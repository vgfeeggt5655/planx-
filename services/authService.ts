import { User } from '../types';

const API_URL = 'https://script.google.com/macros/s/AKfycbwMCPhSKNab-CvtYfY114MdFqcuDS-SkmM3tlgfAr-Osjfxo0VJ04B76cRzgTiW9bmVUg/exec';

// WARNING: This authentication method is highly insecure and not suitable for production.
// 1. It fetches all users and their plain-text passwords to the client.
// 2. Passwords are sent over the network and stored in the sheet without hashing.
// This is implemented to match the requested architecture. A proper authentication
// service (e.g., Firebase Auth, Auth0) should be used in a real application.

export const getUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_URL}?action=get`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  const data = await response.json();
  const users = data.data || [];
  // Ensure all IDs are strings to prevent type mismatches.
  return users.map((user: any) => ({
    ...user,
    id: String(user.id),
  }));
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    const users = await getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        throw new Error("User not found.");
    }

    // Coerce both passwords to strings and trim whitespace before comparison.
    // This handles cases where Google Sheets might interpret a numeric password
    // as a number instead of a string, or if there's extra whitespace.
    if (String(user.password).trim() !== String(password).trim()) {
        throw new Error("Incorrect password.");
    }

    return user;
};

export const createUser = async (user: Omit<User, 'id'>): Promise<void> => {
  const formData = new FormData();
  formData.append('action', 'create');
  formData.append('name', user.name);
  formData.append('email', user.email);
  formData.append('password', user.password);
  formData.append('role', user.role);
  formData.append('watched', user.watched || '{}'); // Initialize watched progress
  if (user.avatar) {
    formData.append('avatar', user.avatar);
  }


  await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: formData,
  });
};

export const updateUser = async (user: User): Promise<void> => {
    const formData = new FormData();
    formData.append('action', 'update');
    formData.append('id', user.id);
    formData.append('name', user.name);
    formData.append('email', user.email);
    formData.append('password', user.password);
    formData.append('role', user.role);
    if (user.avatar) {
        formData.append('avatar', user.avatar);
    }
    if (user.watched) {
        formData.append('watched', user.watched);
    }


    await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
    });
};

export const deleteUser = async (id: string): Promise<void> => {
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id', id);

    await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
    });
};