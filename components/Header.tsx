import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'https://esm.sh/react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogoutIcon, TachometerIcon, UserCircleIcon, ChevronDownIcon, MenuIcon, XIcon } from './Icons';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false); // State for mobile menu
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Close dropdown/menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLinkClass = "text-primary font-semibold bg-primary/10";
  const inactiveLinkClass = "text-text-secondary hover:text-primary hover:bg-surface";
  const linkBaseClass = "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors";

  const navLinks = (
    <>
      <NavLink
        to="/"
        end
        onClick={() => setMenuOpen(false)}
        className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
      >
        All Content
      </NavLink>
      {(user?.role === 'admin' || user?.role === 'super_admin') && (
        <NavLink
          to="/admin"
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
        >
          <TachometerIcon className="h-5 w-5" />
          Dashboard
        </NavLink>
      )}
    </>
  );

  return (
    <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border-color">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <NavLink to="/" className="text-xl font-bold text-text-primary flex items-center gap-2">
           <span>Plan X</span>
        </NavLink>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
            {navLinks}
        </div>

        <div className="flex items-center gap-2">
            {user && (
               <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full hover:bg-primary/20"
                    >
                        {user.avatar ? (
                            <img src={user.avatar} alt="User Avatar" className="h-8 w-8 rounded-full object-cover border-2 border-primary/50" />
                        ) : (
                            <UserCircleIcon className="h-8 w-8"/>
                        )}
                        <span className="hidden sm:inline font-medium">{user.name}</span>
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-surface border border-border-color rounded-md shadow-lg py-1 z-10 animate-fade-in-up" style={{animationDuration: '0.2s'}}>
                            <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-primary/20 hover:text-primary transition-colors">
                                <UserCircleIcon className="h-5 w-5" />
                                <span>Profile</span>
                            </Link>
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-red-500/20 hover:text-red-500 transition-colors">
                               <LogoutIcon className="h-5 w-5" />
                               <span>Logout</span>
                            </button>
                        </div>
                    )}
               </div>
            )}
            {/* Mobile Menu Button */}
            <div className="md:hidden">
                <button onClick={() => setMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-text-secondary hover:text-primary hover:bg-primary/20">
                    {isMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                </button>
            </div>
        </div>
      </nav>
      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
         <div className="md:hidden bg-surface border-t border-border-color animate-fade-in-up" style={{animationDuration: '0.2s'}}>
            <div className="container mx-auto px-4 py-2 flex flex-col gap-1">
                {navLinks}
            </div>
         </div>
      )}
    </header>
  );
};

export default Header;
