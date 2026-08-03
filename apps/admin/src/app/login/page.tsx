import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <span className="text-4xl">⚽</span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">RealPalpiteFC</h1>
          <p className="text-sm text-slate-500">Painel Administrativo</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
