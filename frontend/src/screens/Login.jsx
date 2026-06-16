import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';
import { Lock } from 'lucide-react';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) return;

    setLoading(true);
    setError('');

    try {
      // Test the PIN against the backend verify endpoint
      await apiFetch('/auth/verify', {
        method: 'POST',
        headers: {
          'X-API-Key': pin
        }
      });
      // If it didn't throw an error, it's valid
      login(pin);
    } catch (err) {
      if (err.message.includes('429')) {
        setError('Terlalu banyak percobaan. Silakan tunggu sebentar.');
      } else {
        setError('PIN tidak valid.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Dimsavor Admin</h1>
          <p className="text-gray-500 mt-2 text-sm">Masukkan PIN rahasia untuk mengakses sistem.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              className="w-full text-center text-2xl tracking-widest px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow"
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full bg-orange-600 text-white font-medium py-3 rounded-lg shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Memverifikasi...' : 'Masuk Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}
