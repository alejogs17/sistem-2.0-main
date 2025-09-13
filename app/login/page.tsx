"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  const [error, setError] = useState('');
  const router = useRouter()

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      // Redirige inmediatamente al dashboard (middleware mantendrá la sesión)
      router.replace('/')
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border rounded-lg shadow-sm p-6 sm:p-8 border-t-4 border-t-red-600">
          <div className="flex flex-col items-center text-center">
            {/* Logo: archivo ubicado en public/ */}
            <div className="mb-3">
              <Image
                src="/motorsport-racing-logo-design-template-ideas-sport-industry-transportation-inspiration-motorsport-racing-logo-design-212415760.webp"
                alt="motoRacingSport"
                width={96}
                height={96}
                className="h-16 w-auto"
                priority
              />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">motoRacingSport</h2>
            <p className="text-sm text-gray-500">Sistema de inventario para repuestos</p>
          </div>

          <h1 className="mt-6 text-center text-2xl font-bold text-gray-900">Iniciar sesión</h1>

          {error && (
            <p className="mt-4 text-center text-red-700 bg-red-50 border border-red-200 rounded-md py-2 px-3">
              {error}
            </p>
          )}

          <div className="mt-6">
            <LoginForm onLogin={handleLogin} />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-gray-500">© {new Date().getFullYear()} motoRacingSport</p>
      </div>
    </div>
  );
}
