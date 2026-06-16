import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChefHat } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
    } catch (err) {
      setError('Email atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="max-w-sm w-full card shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[var(--amber-dim)] rounded-full flex items-center justify-center border-2 border-[var(--amber)]">
            <ChefHat className="w-8 h-8 text-[var(--amber)]" />
          </div>
        </div>
        
        <h2 className="text-center text-[24px] font-['Space_Grotesk'] font-semibold text-[var(--text-primary)] mb-2">
          DimsaVora Ops
        </h2>
        <p className="text-center text-[13px] text-[var(--text-secondary)] font-['Inter'] mb-8">
          Masuk ke sistem operasi Dimsavor.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="adit@dimsavor.internal"
              required
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && (
            <div className="text-[var(--status-cancelled)] text-[12px] text-center font-['Inter']">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary w-full mt-2"
            disabled={isLoading}
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
