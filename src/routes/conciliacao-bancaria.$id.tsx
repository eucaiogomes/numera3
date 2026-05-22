import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { BankingInvestmentStatements } from '@/components/banking/BankingInvestmentStatements';
import { ChatDashboard } from '@/components/banking/ChatDashboard';
import {
  fetchBankingReconciliation,
  getBankingReconciliation,
} from '@/lib/banking/banking-reconciliation-store';
import type { BankingReconciliationCase } from '@/lib/banking/banking-reconciliation-store';


export const Route = createFileRoute('/conciliacao-bancaria/$id')({
  component: BankingReconciliationPage,
});

function BankingReconciliationPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [reconciliation, setReconciliation] = useState<BankingReconciliationCase | undefined>(
    () => getBankingReconciliation(id),
  );
  const [loading, setLoading] = useState(!reconciliation);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchBankingReconciliation(id)
      .then((caseData) => {
        if (active) setReconciliation(caseData);
      })
      .catch((error) => {
        console.warn('Nao foi possivel carregar a conciliacao bancaria.', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading && !reconciliation) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto bg-white border border-gray-200/80 rounded-xl shadow-sm p-10 text-center">
          <FileText className="w-9 h-9 text-gray-300 mx-auto mb-3" />
          <h1 className="text-[16px] font-semibold text-[#0a2520]">
            Carregando conciliação bancária
          </h1>
          <p className="text-[13px] text-gray-400 mt-1">
            Buscando resultado salvo.
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!reconciliation) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto bg-white border border-gray-200/80 rounded-xl shadow-sm p-10 text-center">
          <FileText className="w-9 h-9 text-gray-300 mx-auto mb-3" />
          <h1 className="text-[16px] font-semibold text-[#0a2520]">
            Conciliação bancária não encontrada
          </h1>
          <p className="text-[13px] text-gray-400 mt-1">
            O resultado fica salvo apenas nesta sessão por enquanto.
          </p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="mt-5 h-9 px-4 rounded-lg bg-[#0a2520] text-white text-[13px] font-medium hover:bg-[#0d3530] transition-colors"
          >
            Nova conciliação bancária
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-3 mb-4 md:mb-6">
          <button
            onClick={() => navigate({ to: '/' })}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0d9488] hover:border-[#0d9488]/40 transition-colors shrink-0 mt-0.5"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-[#0a2520] tracking-tight leading-tight">
              Resultado da conciliação bancária
            </h1>
            <p className="text-[12px] md:text-[13px] text-gray-400 mt-0.5 truncate">
              Competência {reconciliation.competence} · {reconciliation.statementsCount} conta corrente · {reconciliation.investmentStatementsCount} aplicação
            </p>
          </div>
        </div>

        <ChatDashboard
          reconciliationId={reconciliation.id}
          results={reconciliation.results}
          initialReviewItems={reconciliation.reviewItems}
          competence={reconciliation.competence}
          variant="panel"
        />

        {reconciliation.investmentStatements.length > 0 && (
          <div className="mt-5">
            <BankingInvestmentStatements statements={reconciliation.investmentStatements} />
          </div>
        )}

      </div>
    </AppLayout>
  );
}
