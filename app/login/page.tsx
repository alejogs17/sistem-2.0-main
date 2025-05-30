"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-pink-400 via-orange-400 to-yellow-300 flex flex-col items-center justify-center px-4">
      <h2 className="mb-8 text-white text-3xl font-extrabold drop-shadow-lg select-none">
        Moto Racing Sports
      </h2>
      <div className="bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6">
        <h1 className="text-center text-4xl font-extrabold text-gray-900 drop-shadow-md">
          Iniciar Sesión
        </h1>
        {error && (
          <p className="text-center text-red-600 bg-red-100 border border-red-400 rounded-md py-2 px-3 font-semibold shadow-sm animate-shake">
            {error}
          </p>
        )}
        <LoginForm onLogin={handleLogin} />
      </div>
    </div>
  );
}
