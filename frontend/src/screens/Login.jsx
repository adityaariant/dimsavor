import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

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
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <Card className="max-w-sm w-full shadow-paper border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Dimsavor Logo" className="h-16 w-auto object-contain" />
          </div>
          
          <CardTitle className="text-[24px] font-display font-semibold text-foreground">
            Dimsavor
          </CardTitle>
          <CardDescription className="text-[13px] font-sans">
            Masuk ke sistem operasi Dimsavor.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Email</label>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="[EMAIL_ADDRESS]"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Password</label>
              <Input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="text-destructive text-[12px] text-center font-sans">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
