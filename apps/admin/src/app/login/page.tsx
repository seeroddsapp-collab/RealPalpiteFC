import Image from 'next/image'
import logo from '@/imagens/logorp.png'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-navy-900">
      {/* Glow decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500 opacity-5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src={logo} alt="RealPalpiteFC" width={96} height={96} className="rounded-3xl shadow-2xl mb-4" />
          <h1 className="text-2xl font-bold text-white tracking-wide">RealPalpiteFC</h1>
          <p className="text-gold-500 text-sm tracking-widest uppercase mt-1">Painel Administrativo</p>
        </div>

        {/* Card */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 shadow-2xl">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
