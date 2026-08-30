import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-indigo-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-900">Sign in to your dashboard</span>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
