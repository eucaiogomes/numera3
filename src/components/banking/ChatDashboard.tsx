import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Clock,
  TrendingUp,
  Building2,
  Landmark,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  MinusCircle,
  Banknote,
  ArrowRight,
  FileText,
  Sparkles,
  BadgeCheck,
  ListChecks,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { BalanceReconciliationResult, BankingReviewItem, SuggestedBankingEntry } from '@/lib/banking/types';
import { getBankingReconciliation, updateBankingReviewItem } from '@/lib/banking/banking-reconciliation-store';

function fmtCurrency(value: number | undefined) {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(iso: string | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}


function fmtCompetence(iso: string | undefined) {
  if (!iso) return '—';
  const [y, m] = iso.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y}`;
}

function fmtMonth(value: string | undefined) {
  if (!value) return 'Competência';
  const [year, month] = value.slice(0, 7).split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[Number(month) - 1] ?? month} ${year}`;
}

function primaryResult(results: BalanceReconciliationResult[]) {
  return results.find((r) => r.status === 'divergent') ?? results.find((r) => r.status === 'reconciled') ?? results[0];
}

function statusLabel(status: BalanceReconciliationResult['status']) {
  const labels: Record<BalanceReconciliationResult['status'], string> = {
    reconciled: 'Conciliada',
    divergent: 'Divergente',
    missing_statement: 'Sem extrato',
    missing_ledger: 'Sem razão',
    investment_statement_parsed: 'Aplicação lida',
    insufficient_data: 'Dados insuficientes',
  };
  return labels[status];
}

function accountDisplayName(result: BalanceReconciliationResult | undefined) {
  if (!result) return 'Conta bancária';
  return `${result.accountCode} - ${result.accountName}`;
}


function PanelKpi({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-[#d7e7e3] bg-white/70 p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8da09b]">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${danger ? 'text-[#c44d59]' : 'text-[#0a2520]'}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-[#6f827d]">{sub}</p>}
    </div>
  );
}

function PanelPeriodCard({ result }: { result: BalanceReconciliationResult }) {
  const ok = result.status === 'reconciled';
  const diff = Math.abs(result.difference ?? result.finalCheckpoint?.difference ?? 0);

  return (
    <div className={`rounded-xl border p-3 ${ok ? 'border-[#9fd8cc] bg-[#e8f7f3]' : 'border-[#efb5bb] bg-[#fff1f2]'}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className={`text-sm font-bold ${ok ? 'text-[#087568]' : 'text-[#c44d59]'}`}>{fmtMonth(result.periodStart ?? result.periodEnd)}</h3>
          <p className="text-[11px] text-[#6f827d]">{ok ? 'Conciliado' : 'Pendente de ajuste'}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ok ? 'border-[#9fd8cc] bg-[#dbf4ee] text-[#087568]' : 'border-[#efb5bb] bg-[#ffe4e7] text-[#b63d4a]'}`}>
          {ok ? 'Conciliada' : 'Divergente'}
        </span>
      </div>
      <div className="space-y-1.5 text-[11.5px]">
        <div className="flex justify-between gap-3"><span className="text-[#6f827d]">Saldo extrato</span><strong>{fmtCurrency(result.finalCheckpoint?.statementBalance)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-[#6f827d]">Saldo Questor</span><strong>{fmtCurrency(result.finalCheckpoint?.ledgerBalance)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-[#6f827d]">Diferença</span><strong className={diff > 0 ? 'text-[#c44d59]' : 'text-[#087568]'}>{fmtCurrency(diff)}</strong></div>
      </div>
      {result.lastMatchedCheckpoint && (
        <div className="mt-3 rounded-lg border border-[#d7e7e3] bg-white/45 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8da09b]">Último dia conciliado</p>
          <p className="mt-1 text-[12px] font-semibold text-[#0a2520]">{fmtDate(result.lastMatchedCheckpoint.date)}</p>
        </div>
      )}
    </div>
  );
}


function PanelMissingDocs({ results }: { results: BalanceReconciliationResult[] }) {
  const missing = results.filter((result) => result.status === 'missing_statement' || result.status === 'missing_ledger');
  if (missing.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#d7e7e3] bg-white/65 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FileWarning className="h-4 w-4 text-[#a97805]" />
        <h3 className="text-sm font-bold text-[#0a2520]">Contas fora da conciliação automática</h3>
      </div>
      <div className="space-y-2">
        {missing.map((result) => (
          <div key={`${result.accountCode}-${result.status}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#d7e7e3] bg-[#edf6f3] px-3 py-2">
            <div>
              <p className="text-[12px] font-semibold text-[#17332e]">{accountDisplayName(result)}</p>
              <p className="mt-0.5 text-[11px] text-[#6f827d]">{result.message}</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#e6ca8b] bg-[#fff4d8] px-2 py-0.5 text-[10px] font-semibold text-[#8a6508]">
              {statusLabel(result.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelMethodology() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-[#d7e7e3] bg-white/65 p-4">
        <div className="mb-2 flex items-center gap-2 text-[#087568]">
          <CheckCircle2 className="h-4 w-4" />
          <h3 className="text-sm font-bold">Lado A</h3>
        </div>
        <p className="text-[12px] leading-relaxed text-[#6f827d]">
          Questor: balancete para identificar contas analíticas e Razão para validar saldos e lançamentos.
        </p>
      </div>
      <div className="rounded-xl border border-[#d7e7e3] bg-white/65 p-4">
        <div className="mb-2 flex items-center gap-2 text-[#2563a8]">
          <Building2 className="h-4 w-4" />
          <h3 className="text-sm font-bold">Lado B</h3>
        </div>
        <p className="text-[12px] leading-relaxed text-[#6f827d]">
          Documentação do cliente: extratos PDF de conta corrente ou aplicação usados como fonte externa.
        </p>
      </div>
      <div className="rounded-xl border border-[#d7e7e3] bg-white/65 p-4">
        <div className="mb-2 flex items-center gap-2 text-[#a97805]">
          <ListChecks className="h-4 w-4" />
          <h3 className="text-sm font-bold">Critério</h3>
        </div>
        <p className="text-[12px] leading-relaxed text-[#6f827d]">
          Se o saldo final fecha, a conta é conciliada. Se não fecha, o relatório mostra último dia OK e primeira divergência.
        </p>
      </div>
    </div>
  );
}

function DiverenceTable({ primary, difference }: { primary: BalanceReconciliationResult; difference: number }) {
  const [open, setOpen] = useState(false);
  const tableRows = [
    ...primary.ledgerEntriesOnDivergenceDate.map((e) => ({
      side: 'A', date: e.date, description: e.history, amount: e.amount, probable: false,
    })),
    ...primary.statementEntriesOnDivergenceDate.map((e) => ({
      side: 'B', date: e.date, description: e.description, amount: e.amount,
      probable: Math.abs(Math.abs(e.amount) - difference) <= 0.009,
    })),
  ];
  if (tableRows.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-[13px] font-semibold text-[#0a2520]">
          Ver lançamentos do dia {fmtDate(primary.firstDivergentCheckpoint?.date)}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full min-w-[560px] text-left text-[12px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[11px]">
                <th className="px-4 py-2 font-semibold">Fonte</th>
                <th className="px-3 py-2 font-semibold">Descrição</th>
                <th className="px-3 py-2 font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map((row, i) => (
                <tr key={i} className={row.probable ? 'bg-amber-50' : ''}>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${row.side === 'A' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>
                      {row.side === 'A' ? 'Questor' : 'Extrato'}
                      {row.probable && <span className="text-amber-600 ml-1">← provável</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700 max-w-[280px] truncate">{row.description}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${row.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmtCurrency(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PanelFullReport({
  reconciliationId,
  results,
  reviewItems,
  competence,
}: {
  reconciliationId: string;
  results: BalanceReconciliationResult[];
  reviewItems: BankingReviewItem[];
  competence: string;
}) {
  const caseData = getBankingReconciliation(reconciliationId);
  const primary = primaryResult(results);
  const difference = Math.abs(primary?.difference ?? 0);
  const missingDocs = results.filter((r) => r.status === 'missing_statement' || r.status === 'missing_ledger');
  const divergentResults = results.filter((r) => r.status === 'divergent');
  const reconciledResults = results.filter((r) => r.status === 'reconciled');
  const openItems = reviewItems.filter((i) => i.status === 'open');
  const allGood = divergentResults.length === 0 && missingDocs.length === 0 && openItems.length === 0;
  const candidate = primary?.statementEntriesOnDivergenceDate.find(
    (e) => Math.abs(Math.abs(e.amount) - difference) <= 0.009,
  ) ?? primary?.statementEntriesOnDivergenceDate[0];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className={`px-5 py-4 border-b ${allGood ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${allGood ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              {allGood
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                : <AlertTriangle className="w-5 h-5 text-amber-600" />}
            </div>
            <div>
              <p className={`text-[18px] font-bold leading-tight ${allGood ? 'text-emerald-800' : 'text-amber-900'}`}>
                {allGood ? 'Conciliação concluída' : `${divergentResults.length > 0 ? 'Divergência encontrada' : 'Atenção necessária'}`}
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {primary?.accountCode} · {primary?.accountName} · {fmtMonth(competence)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 shrink-0 mt-1">
            {caseData ? new Date(caseData.createdAt).toLocaleString('pt-BR') : ''}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Balances — always visible, big and clear */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Extrato banco</p>
            <p className="text-[17px] font-bold text-[#0a2520] tabular-nums">{fmtCurrency(primary?.finalCheckpoint?.statementBalance)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(primary?.finalCheckpoint?.date)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Razão Questor</p>
            <p className="text-[17px] font-bold text-[#0a2520] tabular-nums">{fmtCurrency(primary?.finalCheckpoint?.ledgerBalance)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">contabilidade</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${difference > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Diferença</p>
            <p className={`text-[17px] font-bold tabular-nums ${difference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmtCurrency(difference)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{difference > 0 ? 'a regularizar' : 'zerada'}</p>
          </div>
        </div>

        {/* Divergence explanation — plain language */}
        {primary?.status === 'divergent' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[13px] font-semibold text-amber-900 mb-2">O que está divergindo</p>
            <div className="space-y-2 text-[12.5px] text-amber-800">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Conciliado até <strong>{fmtDate(primary.lastMatchedCheckpoint?.date)}</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span>Primeira divergência em <strong>{fmtDate(primary.firstDivergentCheckpoint?.date)}</strong> — diferença de <strong>{fmtCurrency(difference)}</strong></span>
              </div>
              {candidate && (
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>Lançamento provável no extrato: <strong>"{candidate.description}"</strong> ({fmtCurrency(candidate.amount)})</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action checklist — numbered, simple */}
        {openItems.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-[13px] font-semibold text-[#0a2520] mb-3">O que fazer agora</p>
            <div className="space-y-2">
              {openItems.map((item, i) => (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#0a2520] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-[#0a2520]">{item.title}</p>
                    <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">{item.detail}</p>
                    {item.amount !== undefined && (
                      <p className="text-[11.5px] font-semibold text-red-600 mt-0.5 tabular-nums">{fmtCurrency(item.amount)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allGood && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
            <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-[13px] font-medium text-emerald-800">Todas as contas estão conciliadas. Nenhuma ação necessária.</p>
          </div>
        )}

        {/* Period summary — compact */}
        {results.filter((r) => r.periodStart || r.periodEnd).length > 0 && (
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Resumo por período</p>
            </div>
            <div className="divide-y divide-gray-100">
              {results
                .filter((r) => r.periodStart || r.periodEnd)
                .sort((a, b) => (a.periodStart ?? '').localeCompare(b.periodStart ?? ''))
                .map((r, i) => {
                  const ok = r.status === 'reconciled';
                  const diff = Math.abs(r.difference ?? 0);
                  return (
                    <div key={i} className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span className="text-[12.5px] font-medium text-[#0a2520] truncate">{fmtMonth(r.periodStart ?? r.periodEnd)}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <span className="text-[12px] text-gray-500 tabular-nums hidden sm:block">{fmtCurrency(r.finalCheckpoint?.statementBalance)}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {ok ? 'Conciliado' : `Dif. ${fmtCurrency(diff)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Technical detail — collapsed by default */}
        {primary && primary.status === 'divergent' && (
          <DiverenceTable primary={primary} difference={difference} />
        )}

        {/* Missing docs */}
        {missingDocs.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <FileWarning className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Contas sem extrato</p>
            </div>
            <div className="divide-y divide-gray-100">
              {missingDocs.map((r) => (
                <div key={r.accountCode} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-[#0a2520] font-medium">{r.accountCode} · {r.accountName}</p>
                  <span className="text-[11px] text-gray-400 shrink-0">{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
          <span>{reconciledResults.length} conciliada(s) · {divergentResults.length} divergente(s)</span>
          <span>{caseData?.fileNames.statements.length ?? 0} extrato(s)</span>
          {(caseData?.investmentStatementsCount ?? 0) > 0 && (
            <span>{caseData?.investmentStatementsCount} aplicação(ões)</span>
          )}
        </div>

      </div>
    </div>
  );
}

function SummaryBar({ results }: { results: BalanceReconciliationResult[] }) {
  const reconciled = results.filter((r) => r.status === 'reconciled');
  const divergent = results.filter((r) => r.status === 'divergent');
  const missing = results.filter(
    (r) => r.status === 'missing_statement' || r.status === 'missing_ledger',
  );
  const investment = results.filter((r) => r.status === 'investment_statement_parsed');

  const totalDifference = divergent.reduce((s, r) => s + Math.abs(r.difference ?? 0), 0);
  const totalReconciled = reconciled.reduce(
    (s, r) => s + Math.abs(r.finalCheckpoint?.statementBalance ?? 0),
    0,
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Conciliadas</span>
        </div>
        <p className="text-[22px] font-bold text-emerald-700 leading-none">{reconciled.length}</p>
        {totalReconciled > 0 && (
          <p className="text-[10px] text-emerald-500 mt-1 truncate">{fmtCurrency(totalReconciled)}</p>
        )}
      </div>

      <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Divergentes</span>
        </div>
        <p className="text-[22px] font-bold text-amber-700 leading-none">{divergent.length}</p>
        {totalDifference > 0 && (
          <p className="text-[10px] text-amber-500 mt-1 truncate">{fmtCurrency(totalDifference)}</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <FileWarning className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sem doc.</span>
        </div>
        <p className="text-[22px] font-bold text-gray-600 leading-none">{missing.length}</p>
        <p className="text-[10px] text-gray-400 mt-1">conta(s)</p>
      </div>

      <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
          <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">Aplicações</span>
        </div>
        <p className="text-[22px] font-bold text-teal-700 leading-none">{investment.length}</p>
        <p className="text-[10px] text-teal-500 mt-1">lidas</p>
      </div>
    </div>
  );
}

function AccountIcon({ kind }: { kind: string }) {
  if (kind === 'cash_investment')
    return (
      <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
        <TrendingUp className="w-4 h-4 text-teal-600" />
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
      <Landmark className="w-4 h-4 text-blue-600" />
    </div>
  );
}

function StatusBadge({ status }: { status: BalanceReconciliationResult['status'] }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    reconciled: {
      label: 'Conciliada',
      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    divergent: {
      label: 'Divergente',
      cls: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    missing_statement: {
      label: 'Sem extrato',
      cls: 'bg-gray-100 text-gray-500 border-gray-200',
      icon: <FileWarning className="w-3 h-3" />,
    },
    missing_ledger: {
      label: 'Sem razão',
      cls: 'bg-gray-100 text-gray-500 border-gray-200',
      icon: <FileWarning className="w-3 h-3" />,
    },
    investment_statement_parsed: {
      label: 'Aplicação lida',
      cls: 'bg-teal-100 text-teal-700 border-teal-200',
      icon: <TrendingUp className="w-3 h-3" />,
    },
    insufficient_data: {
      label: 'Dados insuf.',
      cls: 'bg-gray-100 text-gray-400 border-gray-200',
      icon: <Clock className="w-3 h-3" />,
    },
  };
  const s = map[status] ?? map.insufficient_data;
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border font-medium ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function BalanceRow({ label, value, highlight }: { label: string; value: string; highlight?: 'ok' | 'err' }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className={`text-[11.5px] font-semibold tabular-nums ${
        highlight === 'ok' ? 'text-emerald-600' :
        highlight === 'err' ? 'text-amber-700' :
        'text-[#0a2520]'
      }`}>{value}</span>
    </div>
  );
}

function SuggestedEntryChip({ entry }: { entry: SuggestedBankingEntry }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-teal-50 border border-teal-100 px-2.5 py-2 mt-2">
      <Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-teal-800 leading-tight">{entry.history}</p>
        <p className="text-[10.5px] text-teal-600 mt-0.5">
          {fmtDate(entry.date)} · {fmtCurrency(entry.amount)}
        </p>
        <p className="text-[10px] text-teal-500 mt-0.5 flex items-center gap-1">
          <span>{entry.debitAccountName}</span>
          <ArrowRight className="w-2.5 h-2.5" />
          <span>{entry.creditAccountName}</span>
        </p>
      </div>
    </div>
  );
}

function AccountCard({ result }: { result: BalanceReconciliationResult }) {
  const [expanded, setExpanded] = useState(result.status === 'divergent');
  const isDivergent = result.status === 'divergent';
  const isReconciled = result.status === 'reconciled';
  const hasSuggested = (result.suggestedEntries?.length ?? 0) > 0;
  const hasDetails =
    isDivergent ||
    hasSuggested ||
    result.status === 'investment_statement_parsed';

  const period = result.periodStart
    ? `${fmtDate(result.periodStart)} – ${fmtDate(result.periodEnd)}`
    : null;

  return (
    <div className={`rounded-xl border ${isDivergent ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white'} overflow-hidden`}>
      <div
        className={`flex items-center gap-2.5 px-3 py-2.5 ${hasDetails ? 'cursor-pointer hover:bg-gray-50/80' : ''}`}
        onClick={() => hasDetails && setExpanded((e) => !e)}
      >
        <AccountIcon kind={result.accountKind} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12.5px] font-semibold text-[#0a2520] truncate">
              {result.accountCode} — {result.accountName}
            </p>
            <StatusBadge status={result.status} />
          </div>
          {period && (
            <p className="text-[11px] text-gray-400 mt-0.5">{period}</p>
          )}
        </div>

        {result.finalCheckpoint && (
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-[12px] font-bold text-[#0a2520] tabular-nums">
              {fmtCurrency(result.finalCheckpoint.statementBalance)}
            </p>
            <p className="text-[10px] text-gray-400">extrato {fmtDate(result.finalCheckpoint.date)}</p>
          </div>
        )}

        {hasDetails && (
          <button className="shrink-0 text-gray-400 ml-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2.5 space-y-2.5">
          {result.finalCheckpoint && (
            <div className="rounded-lg bg-white border border-gray-100 p-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Saldo final · {fmtDate(result.finalCheckpoint.date)}
              </p>
              <BalanceRow
                label="Extrato bancário"
                value={fmtCurrency(result.finalCheckpoint.statementBalance)}
                highlight={isReconciled ? 'ok' : undefined}
              />
              {result.finalCheckpoint.ledgerBalance !== undefined && (
                <BalanceRow
                  label="Razão contábil"
                  value={fmtCurrency(result.finalCheckpoint.ledgerBalance)}
                  highlight={isReconciled ? 'ok' : undefined}
                />
              )}
              {isDivergent && result.difference !== undefined && (
                <div className="border-t border-amber-100 pt-1.5 mt-1">
                  <BalanceRow
                    label="Diferença"
                    value={fmtCurrency(Math.abs(result.difference))}
                    highlight="err"
                  />
                </div>
              )}
            </div>
          )}

          {isDivergent && (result.lastMatchedCheckpoint || result.firstDivergentCheckpoint) && (
            <div className="rounded-lg bg-white border border-amber-100 p-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Linha do tempo
              </p>
              {result.lastMatchedCheckpoint && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[11px] text-gray-500">
                    Último OK: {fmtDate(result.lastMatchedCheckpoint.date)} · {fmtCurrency(result.lastMatchedCheckpoint.statementBalance)}
                  </span>
                </div>
              )}
              {result.firstDivergentCheckpoint && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-700">
                    1ª divergência: {fmtDate(result.firstDivergentCheckpoint.date)} · diferença {fmtCurrency(result.firstDivergentCheckpoint.difference)}
                  </span>
                </div>
              )}
            </div>
          )}

          {isDivergent && (result.ledgerEntriesOnDivergenceDate.length > 0 || result.statementEntriesOnDivergenceDate.length > 0) && (
            <div className="space-y-1.5">
              {result.statementEntriesOnDivergenceDate.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Extrato na data
                  </p>
                  {result.statementEntriesOnDivergenceDate.slice(0, 3).map((e, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-[11px] text-gray-500 truncate flex-1">{e.description}</span>
                      <span className={`text-[11px] font-medium tabular-nums shrink-0 ${e.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {fmtCurrency(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {result.ledgerEntriesOnDivergenceDate.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Razão na data
                  </p>
                  {result.ledgerEntriesOnDivergenceDate.slice(0, 3).map((e, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-[11px] text-gray-500 truncate flex-1">{e.history}</span>
                      <span className={`text-[11px] font-medium tabular-nums shrink-0 ${e.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {fmtCurrency(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasSuggested && (
            <div>
              <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Lançamentos sugeridos
              </p>
              {result.suggestedEntries!.map((e) => (
                <SuggestedEntryChip key={e.id} entry={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  item,
  reconciliationId,
  onUpdate,
}: {
  item: BankingReviewItem;
  reconciliationId: string;
  onUpdate: (updated: BankingReviewItem) => void;
}) {
  const [note, setNote] = useState(item.note ?? '');
  const isCompleted = item.status === 'done' || item.status === 'approved';
  const isSuggested = item.kind === 'suggested_entry';

  async function handleUpdate(patch: Partial<Pick<BankingReviewItem, 'status' | 'note'>>) {
    const updated = await updateBankingReviewItem(reconciliationId, item.id, {
      ...patch,
      note: patch.note ?? note,
    });
    if (updated) {
      const found = updated.reviewItems.find((i) => i.id === item.id);
      if (found) onUpdate(found);
    }
  }

  const kindLabel: Record<BankingReviewItem['kind'], string> = {
    missing_statement: 'Extrato pendente',
    missing_ledger: 'Razão pendente',
    divergence_check: 'Divergência',
    suggested_entry: 'Lançamento sugerido',
    insufficient_data: 'Dados insuficientes',
  };

  const kindColor: Record<BankingReviewItem['kind'], string> = {
    missing_statement: 'bg-gray-50 text-gray-500 border-gray-200',
    missing_ledger: 'bg-gray-50 text-gray-500 border-gray-200',
    divergence_check: 'bg-amber-50 text-amber-700 border-amber-200',
    suggested_entry: 'bg-teal-50 text-teal-700 border-teal-100',
    insufficient_data: 'bg-gray-50 text-gray-400 border-gray-200',
  };

  const statusColor = isCompleted
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : item.status === 'ignored'
      ? 'bg-gray-50 text-gray-400 border-gray-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  const statusLabel = { open: 'Pendente', approved: 'Aprovado', done: 'Resolvido', ignored: 'Ignorado' };

  return (
    <div className={`rounded-xl border p-3 ${isCompleted ? 'border-emerald-100 bg-emerald-50/20' : item.status === 'ignored' ? 'border-gray-100 bg-gray-50/50 opacity-60' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start gap-2 flex-wrap mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-[#0a2520] leading-snug">{item.title}</p>
          {item.amount !== undefined && (
            <p className="text-[11.5px] font-bold text-[#0d9488] mt-0.5">{fmtCurrency(item.amount)}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${kindColor[item.kind]}`}>
            {kindLabel[item.kind]}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusColor}`}>
            {statusLabel[item.status]}
          </span>
        </div>
      </div>

      <p className="text-[11.5px] text-gray-500 mb-2.5 leading-relaxed">{item.detail}</p>

      {item.dueDate && (
        <p className="text-[10.5px] text-gray-400 mb-2 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Vencimento: {fmtDate(item.dueDate)}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-start">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observação..."
          rows={1}
          className="w-full sm:flex-1 min-h-[32px] max-h-[80px] text-[11.5px] text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 resize-y outline-none focus:border-[#0d9488]/50 bg-white"
        />
        <div className="flex gap-1.5 shrink-0 self-end sm:self-start">
          <button
            onClick={() => handleUpdate({ note })}
            title="Salvar observação"
            className="h-8 px-2 rounded-lg border border-gray-200 text-gray-500 text-[11px] flex items-center gap-1 hover:border-[#0d9488]/40 hover:text-[#0d9488] transition-colors"
          >
            <Save className="w-3 h-3" />
          </button>
          {isCompleted ? (
            <button
              onClick={() => handleUpdate({ status: 'open' })}
              title="Reabrir"
              className="h-8 px-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] flex items-center gap-1 hover:bg-amber-100 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={() => handleUpdate({ status: isSuggested ? 'approved' : 'done' })}
              className="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-[11px] font-medium flex items-center gap-1 hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              {isSuggested ? 'Aprovar' : 'Resolver'}
            </button>
          )}
          {item.status !== 'ignored' && (
            <button
              onClick={() => handleUpdate({ status: 'ignored' })}
              title="Ignorar"
              className="h-8 px-2 rounded-lg bg-gray-50 text-gray-400 border border-gray-200 text-[11px] flex items-center gap-1 hover:bg-gray-100 transition-colors"
            >
              <MinusCircle className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatDashboard({
  reconciliationId,
  results,
  initialReviewItems,
  competence,
  variant = 'bubble',
}: {
  reconciliationId: string;
  results: BalanceReconciliationResult[];
  initialReviewItems: BankingReviewItem[];
  competence: string;
  variant?: 'bubble' | 'panel';
}) {
  const [reviewItems, setReviewItems] = useState(initialReviewItems);
  const isPanel = variant === 'panel';

  const open = reviewItems.filter((i) => i.status === 'open').length;
  const done = reviewItems.filter((i) => i.status === 'done' || i.status === 'approved').length;
  const progress = reviewItems.length > 0 ? Math.round((done / reviewItems.length) * 100) : 100;

  function handleItemUpdate(updated: BankingReviewItem) {
    setReviewItems((current) => current.map((i) => (i.id === updated.id ? updated : i)));
  }

  if (isPanel) {
    return (
      <PanelFullReport
        reconciliationId={reconciliationId}
        results={results}
        reviewItems={reviewItems}
        competence={competence}
      />
    );
  }

  return (
    <div className="flex items-start gap-2 md:gap-3 max-w-full md:max-w-[700px]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0d9488] to-[#0a2520] flex items-center justify-center shrink-0 mt-0.5">
        <Banknote className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 bg-white border border-gray-200/80 shadow-sm overflow-hidden rounded-2xl rounded-tl-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-[#0a2520] to-[#0d3530]">
          <div>
            <p className="text-[14px] font-semibold text-white">Conciliação bancária</p>
            <p className="text-[11px] text-white/50 mt-0.5">
              Competência: {fmtCompetence(competence + '-01')}
            </p>
          </div>
          <Link
            to="/conciliacao-bancaria/$id"
            params={{ id: reconciliationId }}
            className="flex items-center gap-1.5 text-[11.5px] text-white/70 hover:text-white transition-colors shrink-0"
          >
            Ver completo
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="px-3 md:px-4 pt-4 pb-3">
          <SummaryBar results={results} />

          {reviewItems.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Progresso da revisão
                </p>
                <span className="text-[11px] text-gray-500">{done}/{reviewItems.length} resolvidos</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0d9488] to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Contas analisadas
            </p>
            <div className="space-y-2">
              {results.map((r, i) => (
                <AccountCard key={`${r.accountCode}-${i}`} result={r} />
              ))}
            </div>
          </div>

          {reviewItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Itens de revisão
                </p>
                {open > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {open} pendente{open > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {reviewItems.map((item) => (
                  <ReviewCard
                    key={item.id}
                    item={item}
                    reconciliationId={reconciliationId}
                    onUpdate={handleItemUpdate}
                  />
                ))}
              </div>
            </div>
          )}

          {reviewItems.length === 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[12px] text-emerald-700">Nenhuma pendência operacional.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
