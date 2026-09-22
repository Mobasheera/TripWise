export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-slate-600">Connect this screen to Supabase Google OAuth.</p>
        <button className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-white">
          Continue with Google
        </button>
      </div>
    </main>
  );
}
