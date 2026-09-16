import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      <aside className="w-full md:w-52 shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200 md:border-b">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-900">Admin View</p>
            </div>
          </div>
        </div>
        <nav className="flex md:block gap-1 p-2 md:flex-1">
          <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            Analytics
          </Link>
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            ← Back to chatbot
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
