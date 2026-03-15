import { Sidebar } from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        {/* pt-14 on mobile to clear the fixed top bar */}
        <main className="flex-1 overflow-y-auto p-8 pt-8 lg:pt-8 max-lg:pt-[calc(56px+2rem)]">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
