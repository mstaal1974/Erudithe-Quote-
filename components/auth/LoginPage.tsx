import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
    error: string | null;
    onSwitchToQuote: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, error, onSwitchToQuote }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onLogin(email, password);
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <h2 className="text-3xl font-bold text-center text-[#433e3c] mb-6">Erudithe Login</h2>
      <p className="text-center text-stone-500 mb-8">Project Management Portal</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Email Address"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password (leave blank for client login)"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Log In'}
        </Button>
      </form>
      <div className="mt-6 text-center text-sm">
        <button onClick={onSwitchToQuote} className="font-medium text-[#195606] hover:text-green-800">
          Need a new quote? Start here
        </button>
      </div>
       <div className="mt-6 text-center text-sm text-stone-500 space-y-1">
          <p className="font-semibold">Demo Credentials:</p>
          <p className="text-xs">First, you must create these users in your Firebase project's Authentication tab.</p>
          <p>Admin: mstaal@blocksure.com.au / Scribby74!</p>
          <p>Worker: worker1@erudithe.com / password123</p>
          <p className="text-xs">Clients are created via quotes. A real app would use passwordless login for them.</p>
      </div>
    </Card>
  );
};

export default LoginPage;