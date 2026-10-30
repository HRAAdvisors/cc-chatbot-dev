import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <>
      <nav aria-label="Admin tools" className="mx-auto max-w-5xl px-6 pt-6">
        <a
          href="/admin/issues"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          Resource issue reports
        </a>
      </nav>
      <AdminDashboard />
    </>
  );
}
