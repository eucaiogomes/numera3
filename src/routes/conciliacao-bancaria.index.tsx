import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Construction } from 'lucide-react';

export const Route = createFileRoute('/conciliacao-bancaria/')({
  component: EmDesenvolvimento,
});

function EmDesenvolvimento() {
  return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Construction className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-[16px] font-semibold text-[#0a2520]">Em desenvolvimento</h1>
        <p className="text-[13px] text-gray-400 mt-2">Esta seção estará disponível em breve.</p>
      </div>
    </AppLayout>
  );
}
