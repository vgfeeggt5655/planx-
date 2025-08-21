import React, { useState } from 'react';
import { useNavigate, Link } from 'https://esm.sh/react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      // Error is handled in context, will be displayed
    } finally {
      setLoading(false);
    }
  };
  
  const inputClass = "mt-1 block w-full px-3 py-2 bg-surface border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm text-text-primary placeholder-text-secondary transition";

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full mx-auto">
        <div className="flex flex-col justify-center items-center mb-6">
           <img 
            src="https://png.pngtree.com/png-vector/20250423/ourmid/pngtree-3d-cartoon-doctor-character-young-male-round-glasses-png-image_16046563.png" 
            alt="Plan X Avatar"
            className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-primary/50"
          />
          <h1 className="text-3xl font-bold text-text-primary">Welcome to Plan X</h1>
        </div>
        <div className="bg-surface border border-border-color px-4 py-6 sm:p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-center text-text-primary mb-6">Login</h2>
          {loading ? (
            <Spinner text="Logging in..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
              {error && <div className="bg-red-500/20 border-l-4 border-red-400 text-red-300 p-4 rounded-md" role="alert"><p>{error}</p></div>}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email Address</label>
                <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputClass} />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary">Password</label>
                <input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={inputClass} />
              </div>

              <div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-background bg-primary hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-all transform hover:scale-105">
                  Sign in
                </button>
              </div>
            </form>
          )}
           <p className="mt-6 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-primary hover:text-cyan-400">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;