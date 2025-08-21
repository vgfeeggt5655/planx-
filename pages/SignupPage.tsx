import React, { useState } from 'react';
import { useNavigate, Link } from 'https://esm.sh/react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';

const AVATARS = [
    'https://png.pngtree.com/png-vector/20250423/ourmid/pngtree-3d-cartoon-doctor-character-young-male-round-glasses-png-image_16046563.png',
    'https://png.pngtree.com/png-vector/20250210/ourmid/pngtree-male-doctor-showing-a-thumbs-up-sign-symbolizing-approval-in-3d-png-image_15433614.png',
    'https://png.pngtree.com/png-vector/20250409/ourmid/pngtree-3d-male-doctor-character-png-image_15952878.png',
    'https://t4.ftcdn.net/jpg/06/14/96/05/360_F_614960515_mQsF7nS1r3qZ9eCHzqJ5cyCxmjsfJOCQ.jpg',
    'https://img.freepik.com/premium-photo/3d-cartoon-character-female-doctor_299560-352.jpg',
    'https://i.pinimg.com/736x/1f/25/f5/1f25f5903952a2dbca09050725ebae35.jpg',
];

const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Full Name is required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let formattedName = name.trim();
      // Check if name starts with "dr" or "dr." case-insensitively, followed by a space
      if (!/^dr\.?\s/i.test(formattedName)) {
          formattedName = `Dr. ${formattedName}`;
      }

      await signup(formattedName, email, password, selectedAvatar);
      alert('Signup successful! Please log in.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "mt-1 block w-full px-3 py-2 bg-surface border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-text-primary placeholder-text-secondary transition";

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full mx-auto">
        <div className="flex justify-center items-center mb-6">
          <h1 className="text-3xl font-bold text-text-primary ml-3">Create Your Plan X Account</h1>
        </div>
        <div className="bg-surface border border-border-color px-4 py-6 sm:p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-center text-text-primary mb-6">Create Account</h2>
          {loading ? (
            <Spinner text="Creating account..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="bg-red-500/20 border-l-4 border-red-400 text-red-300 p-4 rounded-md" role="alert"><p>{error}</p></div>}
              
               <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Choose Your Avatar</label>
                  <div className="flex justify-center items-center flex-wrap gap-3">
                    {AVATARS.map((avatar, index) => (
                      <button type="button" key={index} onClick={() => setSelectedAvatar(avatar)} className={`rounded-full transition-all duration-200 ${selectedAvatar === avatar ? 'ring-4 ring-primary' : 'ring-2 ring-transparent hover:ring-primary/50'}`}>
                        <img src={avatar} alt={`Avatar ${index + 1}`} className="w-16 h-16 rounded-full object-cover border-2 border-surface" />
                      </button>
                    ))}
                  </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-text-secondary">Full Name</label>
                <input type="text" name="name" id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className={inputClass} />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email Address</label>
                <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputClass} />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary">Password</label>
                <input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className={inputClass} />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary">Confirm Password</label>
                <input type="password" name="confirmPassword" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" className={inputClass} />
              </div>

              <div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-background bg-primary hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary transition-all transform hover:scale-105">
                  Sign up
                </button>
              </div>
            </form>
          )}
           <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-cyan-400">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;