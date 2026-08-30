export default function MarketingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="h-10 w-10 rounded-lg bg-indigo-600" aria-hidden="true" />
      <h1 className="mt-6 text-3xl font-semibold text-slate-900">MyPlatform</h1>
      <p className="mt-3 max-w-md text-slate-600">
        Give any merchant their own dropshipping storefront on a subdomain, backed by one shared supplier catalog
        and one dashboard.
      </p>
      <a
        href="http://app.localhost:3000/login"
        className="mt-6 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Merchant sign in
      </a>
      <p className="mt-2 text-xs text-slate-400">
        Hardcoded to the local dev app subdomain — point this at your real app.&lt;domain&gt; once deployed.
      </p>
    </main>
  );
}
