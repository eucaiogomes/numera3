import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Paperclip,
  Mic,
  Settings,
  SendHorizonal,
  Calculator,
  Scale,
  BarChart3,
  FileText,
  ArrowUpRight,
  Command,
  Sparkles,
  X,
  Square,
  Check,
  Loader2,
  AlertCircle,
  Upload,
  Banknote,
  ChevronRight,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { runFileClassifierAgent, type ClassificationSummary } from '@/lib/banking/file-classifier-agent';
import { runCompletenessAgent } from '@/lib/banking/completeness-agent';
import { runReconciliationAgent } from '@/lib/banking/reconciliation-agent';
import { saveBankingReconciliation } from '@/lib/banking/banking-reconciliation-store';

export const Route = createFileRoute('/')({
  component: Index,
});

type Tab = {
  id: string;
  icon: typeof Calculator;
  label: string;
  suggestions: Suggestion[];
};

type Suggestion = {
  label: string;
  action: 'reconcile' | 'simulate';
  response?: SimulatedResponse;
};

type SimulatedResponse = {
  title: string;
  sections: { heading?: string; items?: string[]; text?: string }[];
  badge?: string;
};

const SIMULATED: Record<string, SimulatedResponse> = {
  'Conciliar extrato bancário com lançamentos contábeis': {
    title: 'Como funciona a conciliação bancária',
    badge: 'Conciliação',
    sections: [
      {
        heading: 'O que a Numera faz',
        items: [
          'Lê seu extrato bancário (.ofx, .csv ou .pdf) e o Razão Contábil do Questor',
          'Cruza cada movimentação do banco com o lançamento contábil correspondente',
          'Identifica datas, valores e históricos divergentes automaticamente',
          'Gera um relatório com o status de cada conta: conciliado ✔ ou com diferença ✘',
        ],
      },
      {
        heading: 'Exemplo de resultado',
        items: [
          'Banco Itaú CC — Extrato R$ 48.320,00 · Razão R$ 48.320,00 · ✔ Conciliado',
          'Banco Bradesco CC — Extrato R$ 12.450,00 · Razão R$ 11.900,00 · ✘ Diferença R$ 550,00',
          'Origem provável: lançamento de tarifa bancária em 15/05 não registrado no Questor',
        ],
      },
      {
        text: '📎 Para rodar de verdade, anexe o Balancete, Razão Contábil e os Extratos bancários acima e clique em Enviar.',
      },
    ],
  },
  'Identificar lançamentos não conciliados': {
    title: 'Lançamentos não conciliados — como identificar',
    badge: 'Conciliação',
    sections: [
      {
        heading: 'Causas mais comuns',
        items: [
          'Lançamento contábil registrado com data diferente da movimentação bancária',
          'Valor divergente por arredondamento ou partição de pagamento',
          'Transferência entre contas lançada em duplicidade no razão',
          'Débito automático (tarifas, seguros) não lançado pelo contador',
          'Cheque emitido mas ainda não compensado pelo banco',
        ],
      },
      {
        heading: 'Exemplo real identificado',
        items: [
          'Conta 1.1.1.01 — 3 lançamentos sem par no extrato (total R$ 2.340,00)',
          'Conta 1.1.1.03 — 1 débito no extrato sem lançamento contábil (R$ 87,50 tarifa)',
          'Ação sugerida: revisar competência dos lançamentos de 28 a 31/05',
        ],
      },
      {
        text: '📎 Envie os arquivos para a Numera identificar e listar automaticamente todos os lançamentos sem par.',
      },
    ],
  },
  'Analisar diferenças de conciliação': {
    title: 'Análise de diferenças — causas e ações',
    badge: 'Conciliação',
    sections: [
      {
        heading: 'Tipos de diferença',
        items: [
          'Diferença de valor: mesmo lançamento, valores distintos no banco e no razão',
          'Diferença de data: lançamento em competências diferentes (ex: virada de mês)',
          'Lançamento a maior: duplicidade no razão contábil',
          'Lançamento a menor: pagamento parcelado registrado como total',
        ],
      },
      {
        heading: 'Fluxo de análise sugerido',
        items: [
          '1. Filtrar diferenças acima de R$ 1.000 — maior risco de autuação',
          '2. Verificar histórico do lançamento no Questor (descrição + CNPJ)',
          '3. Cruzar com nota fiscal ou boleto correspondente',
          '4. Ajustar via lançamento de estorno ou complemento',
        ],
      },
      {
        text: '📎 A Numera classifica cada diferença por tipo e prioridade assim que os arquivos são enviados.',
      },
    ],
  },
  'Gerar relatório de conciliação': {
    title: 'Relatório de conciliação — o que é gerado',
    badge: 'Conciliação',
    sections: [
      {
        heading: 'Conteúdo do relatório',
        items: [
          'Status geral: conciliado ou com divergência por conta bancária',
          'Saldo do extrato vs. saldo do razão com diferença em reais',
          'Lista de lançamentos não conciliados com data, valor e descrição',
          'Documentos faltantes que impedem a conciliação completa',
          'Ações recomendadas numeradas por prioridade',
        ],
      },
      {
        heading: 'Exemplo de cabeçalho do relatório',
        items: [
          'Competência: Maio/2025',
          'Contas analisadas: 4 · Conciliadas: 3 · Com diferença: 1',
          'Maior diferença: Itaú CC R$ 1.240,00 — provável tarifa não lançada',
          'Documentos faltantes: 0',
        ],
      },
      {
        text: '📎 Envie os arquivos e o relatório completo é gerado em segundos, pronto para revisar ou exportar.',
      },
    ],
  },
  'Analisar obrigações fiscais acessórias': {
    title: 'Obrigações fiscais acessórias ativas',
    badge: 'Jurídico',
    sections: [
      {
        heading: 'Obrigações federais mensais',
        items: [
          'EFD-Contribuições — até o 10º dia útil do mês seguinte',
          'DCTFWeb / DCTF — até o 15º dia útil',
          'eSocial — eventos periódicos até o dia 7',
          'EFD-Reinf — empresas com retenções na fonte',
        ],
      },
      {
        heading: 'Obrigações anuais',
        items: [
          'ECF (Escrituração Contábil Fiscal) — até 31 de julho',
          'ECD (Escrituração Contábil Digital) — até 31 de maio',
          'DEFIS (Simples Nacional) — até 31 de março',
          'DIRF — até o último dia útil de fevereiro',
        ],
      },
      {
        text: '⚠️ Multa por atraso: a partir de R$ 500,00 por entrega fora do prazo. Recomenda-se agenda de compliance fiscal atualizada mensalmente.',
      },
    ],
  },
  'Revisar contrato de prestação de serviços contábeis': {
    title: 'Checklist de revisão contratual',
    badge: 'Jurídico',
    sections: [
      {
        heading: 'Cláusulas essenciais',
        items: [
          'Identificação completa das partes (CNPJ, endereço, representante legal)',
          'Escopo detalhado dos serviços prestados',
          'Honorários, forma e periodicidade de pagamento',
          'Prazo de vigência e condições de renovação automática',
          'Responsabilidades e limitações de responsabilidade',
        ],
      },
      {
        heading: 'Pontos de atenção',
        items: [
          'Cláusula de sigilo e proteção de dados (LGPD)',
          'Prazo para entrega de documentos pelo cliente',
          'Previsão de multa por rescisão antecipada',
          'Foro de eleição e lei aplicável',
        ],
      },
      {
        text: '✅ Recomendação: contratos sem revisão há mais de 2 anos devem ser atualizados para incluir cláusulas de LGPD e reajuste de honorários pelo INPC.',
      },
    ],
  },
  'Avaliar riscos tributários em operação societária': {
    title: 'Riscos tributários em operações societárias',
    badge: 'Jurídico',
    sections: [
      {
        heading: 'Principais riscos identificados',
        items: [
          'ITBI — incidência sobre integralização de imóveis ao capital social',
          'IRPJ/CSLL — ganho de capital em cisão, fusão ou incorporação',
          'PIS/COFINS — tratamento de receitas financeiras pós-reorganização',
          'Ágio interno — vedação pela Lei 12.973/2014',
        ],
      },
      {
        heading: 'Due diligence recomendada',
        items: [
          'Levantamento de passivos fiscais contingentes',
          'Análise de créditos tributários não aproveitados',
          'Verificação de parcelamentos em aberto (PERT, REFIS)',
          'Avaliação de benefícios fiscais estaduais transferíveis',
        ],
      },
      {
        text: '📋 Toda reorganização societária deve ser precedida de planejamento tributário formal e parecer jurídico especializado.',
      },
    ],
  },
  'Elaborar DRE do período': {
    title: 'Estrutura da DRE — Demonstração do Resultado',
    badge: 'Contábil',
    sections: [
      {
        heading: 'Estrutura padrão (NBC TG 26)',
        items: [
          '(+) Receita Bruta de Vendas / Serviços',
          '(−) Deduções: devoluções, abatimentos, impostos sobre vendas',
          '(=) Receita Líquida',
          '(−) Custo dos Produtos Vendidos / Serviços Prestados',
          '(=) Lucro Bruto',
          '(−) Despesas Operacionais: administrativas, comerciais, financeiras',
          '(=) Resultado Antes do IR/CSLL',
          '(−) IR e CSLL',
          '(=) Lucro / Prejuízo Líquido do Período',
        ],
      },
      {
        text: '📎 Para gerar a DRE do período, envie o arquivo do Razão Contábil (XLS exportado do Questor) e eu monto a demonstração automaticamente.',
      },
    ],
  },
  'Montar Balanço Patrimonial': {
    title: 'Estrutura do Balanço Patrimonial',
    badge: 'Contábil',
    sections: [
      {
        heading: 'Ativo',
        items: [
          'Ativo Circulante: caixa, bancos, contas a receber, estoques',
          'Ativo Não Circulante: realizável a longo prazo, investimentos, imobilizado, intangível',
        ],
      },
      {
        heading: 'Passivo + Patrimônio Líquido',
        items: [
          'Passivo Circulante: fornecedores, obrigações fiscais, salários a pagar',
          'Passivo Não Circulante: empréstimos LP, provisões',
          'Patrimônio Líquido: capital social, reservas, lucros acumulados',
        ],
      },
      {
        text: '📎 Envie o Balancete do Questor e eu monto o Balanço Patrimonial estruturado com classificação automática das contas.',
      },
    ],
  },
  'Apurar resultado do exercício': {
    title: 'Apuração do resultado do exercício',
    badge: 'Contábil',
    sections: [
      {
        heading: 'Etapas da apuração',
        items: [
          '1. Encerramento das contas de resultado (receitas e despesas)',
          '2. Transferência do saldo para a conta Resultado do Exercício',
          '3. Dedução de IR/CSLL e participações estatutárias',
          '4. Destinação: reservas, dividendos ou lucros acumulados',
        ],
      },
      {
        heading: 'Lançamentos típicos',
        items: [
          'D: Receita de Serviços → C: Resultado do Exercício',
          'D: Resultado do Exercício → C: Despesas Administrativas',
          'D: Resultado do Exercício → C: Provisão IR/CSLL',
        ],
      },
      {
        text: '📎 Para apurar automaticamente, envie o Razão Contábil do período e eu identifico as contas de resultado e monto os lançamentos de encerramento.',
      },
    ],
  },
  'Calcular Simples Nacional do mês': {
    title: 'Cálculo do Simples Nacional',
    badge: 'Tributário',
    sections: [
      {
        heading: 'Fórmula de cálculo (RBT12)',
        items: [
          '1. Apure a Receita Bruta Total dos últimos 12 meses (RBT12)',
          '2. Identifique o Anexo aplicável (I a V)',
          '3. Localize a faixa na tabela progressiva',
          '4. Aplique: Alíquota efetiva = [(RBT12 × Alíq. nominal) − PD] / RBT12',
          '5. DAS = Receita do mês × Alíquota efetiva',
        ],
      },
      {
        heading: 'Alíquotas nominais — Anexo I (Comércio)',
        items: [
          'Até R$ 180.000 → 4,00%',
          'De R$ 180.001 a R$ 360.000 → 7,30%',
          'De R$ 360.001 a R$ 720.000 → 9,50%',
          'De R$ 720.001 a R$ 1.800.000 → 10,70%',
        ],
      },
      {
        text: '📅 Vencimento do DAS: até o dia 20 do mês seguinte ao período de apuração.',
      },
    ],
  },
  'Apurar PIS, COFINS e ICMS': {
    title: 'Apuração PIS, COFINS e ICMS',
    badge: 'Tributário',
    sections: [
      {
        heading: 'PIS/COFINS — Regime não-cumulativo',
        items: [
          'PIS: alíquota de 1,65% sobre receita bruta',
          'COFINS: alíquota de 7,60% sobre receita bruta',
          'Créditos permitidos: insumos, energia, aluguéis, depreciação',
          'Apuração: débitos − créditos = saldo a recolher',
        ],
      },
      {
        heading: 'ICMS — Apuração mensal',
        items: [
          'Débito: ICMS destacado nas notas fiscais de saída',
          'Crédito: ICMS nas entradas de mercadorias e insumos',
          'Saldo credor: transferível para meses seguintes',
          'Prazo: varia por estado (geralmente dia 9 a 15 do mês seguinte)',
        ],
      },
      {
        text: '⚙️ Para apuração automática, envie o livro de apuração ou os arquivos SPED EFD do período.',
      },
    ],
  },
  'Gerar guia de DARF e DAS': {
    title: 'Como gerar DARF e DAS',
    badge: 'Tributário',
    sections: [
      {
        heading: 'DARF — Documento de Arrecadação Federal',
        items: [
          'Acesse o SICALC Web (Receita Federal) ou app ReceitaFácil',
          'Informe o código do tributo (ex: 2089 IRPJ, 6012 CSLL, 5856 PIS)',
          'Preencha período de apuração, vencimento e valor',
          'Gere o código de barras para pagamento',
          'Guarde o comprovante por 5 anos (prazo decadencial)',
        ],
      },
      {
        heading: 'DAS — Simples Nacional',
        items: [
          'Acesse o Portal do Simples Nacional (simples.receita.fazenda.gov.br)',
          'Vá em "Cálculo e Declaração" → PGDAS-D',
          'Informe as receitas por anexo e competência',
          'O sistema calcula e gera o DAS automaticamente',
        ],
      },
      {
        text: '📱 Dica: o app "Meu Imposto de Renda" da Receita Federal também permite emitir DARF para pessoa física.',
      },
    ],
  },
};

const TABS: Tab[] = [
  {
    id: 'conciliacao',
    icon: Calculator,
    label: 'Conciliação',
    suggestions: [
      { label: 'Conciliar extrato bancário com lançamentos contábeis', action: 'simulate' },
      { label: 'Identificar lançamentos não conciliados', action: 'simulate' },
      { label: 'Analisar diferenças de conciliação', action: 'simulate' },
      { label: 'Gerar relatório de conciliação', action: 'simulate' },
    ],
  },
  {
    id: 'juridico',
    icon: Scale,
    label: 'Jurídico',
    suggestions: [
      { label: 'Analisar obrigações fiscais acessórias', action: 'simulate' },
      { label: 'Revisar contrato de prestação de serviços contábeis', action: 'simulate' },
      { label: 'Avaliar riscos tributários em operação societária', action: 'simulate' },
    ],
  },
  {
    id: 'contabil',
    icon: BarChart3,
    label: 'Contábil',
    suggestions: [
      { label: 'Elaborar DRE do período', action: 'simulate' },
      { label: 'Montar Balanço Patrimonial', action: 'simulate' },
      { label: 'Apurar resultado do exercício', action: 'simulate' },
    ],
  },
  {
    id: 'tributario',
    icon: FileText,
    label: 'Tributário',
    suggestions: [
      { label: 'Calcular Simples Nacional do mês', action: 'simulate' },
      { label: 'Apurar PIS, COFINS e ICMS', action: 'simulate' },
      { label: 'Gerar guia de DARF e DAS', action: 'simulate' },
    ],
  },
];

const FILE_COLORS = [
  '#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6',
];

const EXT_LABEL: Record<string, string> = {
  pdf: 'PDF', xls: 'XLS', xlsx: 'XLSX', ofx: 'OFX',
  csv: 'CSV', txt: 'TXT',
};

function SimulatedResponseCard({
  query,
  response,
  onClose,
}: {
  query: string;
  response: SimulatedResponse;
  onClose: () => void;
}) {
  const badgeColor: Record<string, string> = {
    Jurídico: 'bg-purple-100 text-purple-700',
    Contábil: 'bg-blue-100 text-blue-700',
    Tributário: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="mt-4 rounded-2xl border border-gray-200/80 bg-white shadow-[0_4px_24px_-8px_rgba(10,37,32,0.10)] overflow-hidden juris-rise">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0d9488] to-[#0a2520] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-0.5">Você perguntou:</p>
            <p className="text-[13px] font-semibold text-[#0a2520] leading-snug">"{query}"</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-bold text-[#0a2520]">{response.title}</p>
          {response.badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor[response.badge] ?? 'bg-gray-100 text-gray-500'}`}>
              {response.badge}
            </span>
          )}
        </div>

        {response.sections.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{section.heading}</p>
            )}
            {section.items && (
              <ul className="space-y-1.5">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-[#0d9488] shrink-0 mt-0.5" />
                    <span className="text-[12.5px] text-gray-600 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.text && (
              <p className="text-[12px] text-gray-500 mt-2 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">{section.text}</p>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 pb-3 flex items-center gap-2">
        <Sparkles className="w-3 h-3 text-[#0d9488]" />
        <p className="text-[11px] text-gray-400">Numera IA · resposta gerada automaticamente</p>
      </div>
    </div>
  );
}

function Index() {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [simulatedQuery, setSimulatedQuery] = useState<string | null>(null);
  const [simulatedResponse, setSimulatedResponse] = useState<SimulatedResponse | null>(null);

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [stepLabel, setStepLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const current = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const canSend = attachedFiles.length > 0 && !processing;

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const fill = (text: string) => {
    setValue(text);
    requestAnimationFrame(() => {
      autoResize();
      textareaRef.current?.focus();
    });
  };

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    setAttachedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !existingNames.has(f.name))];
    });
    setErrorMsg('');
  }

  function removeFile(name: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  async function handleSend() {
    if (!canSend) return;
    setProcessing(true);
    setErrorMsg('');
    setSimulatedResponse(null);

    try {
      setStepLabel('Identificando arquivos…');
      const summary: ClassificationSummary = await runFileClassifierAgent(attachedFiles, () => {});

      setStepLabel('Verificando completude…');
      const completeness = runCompletenessAgent(summary);

      if (!completeness.ready && !completeness.canProceed) {
        setErrorMsg(completeness.questionText);
        setProcessing(false);
        setStepLabel('');
        return;
      }

      setStepLabel('Conciliando contas…');
      const { results, reviewItems } = await runReconciliationAgent(summary, (steps) => {
        const running = steps.find((s) => s.status === 'running');
        if (running) setStepLabel(`Conciliando ${running.label}…`);
      });

      setStepLabel('Salvando resultados…');
      const allPeriods = [
        ...summary.checkingStatements.map((s) => s.result.periodEnd),
        ...summary.investmentStatements.map((s) => s.result.periodEnd),
      ].sort();
      const competence = (allPeriods.at(-1) ?? new Date().toISOString()).slice(0, 7);
      const id = crypto.randomUUID();

      await saveBankingReconciliation({
        id,
        competence,
        createdAt: new Date().toISOString(),
        fileNames: {
          trialBalance: summary.trialBalance?.file.name ?? 'Não enviado',
          ledger: summary.ledger?.file.name ?? '',
          statements: [
            ...summary.checkingStatements.map((s) => s.file.name),
            ...summary.investmentStatements.map((s) => s.file.name),
          ],
        },
        bankAccountsCount: summary.trialBalance?.result.bankLikeAccounts.length ?? results.length,
        ledgerAccountsCount: summary.ledger?.result.accounts.length ?? 0,
        statementsCount: summary.checkingStatements.length,
        investmentStatementsCount: summary.investmentStatements.length,
        investmentStatements: summary.investmentStatements.map((s) => s.result),
        results,
        reviewItems,
      });

      await navigate({ to: '/conciliacao-bancaria/$id', params: { id } });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar arquivos.');
      setProcessing(false);
      setStepLabel('');
    }
  }

  function handleSuggestionClick(suggestion: Suggestion) {
    setSimulatedResponse(null);
    setSimulatedQuery(null);

    if (suggestion.action === 'reconcile') {
      fill(suggestion.label);
      if (attachedFiles.length > 0) {
        // auto-trigger with a small delay so textarea updates first
        setTimeout(() => handleSend(), 80);
      } else {
        // guide user to attach files
        setErrorMsg('Anexe os arquivos (Balancete, Razão e Extrato) para iniciar a conciliação.');
        fileInputRef.current?.click();
      }
      return;
    }

    // simulate response
    const resp = SIMULATED[suggestion.label];
    if (resp) {
      setSimulatedQuery(suggestion.label);
      setSimulatedResponse(resp);
      setShowSuggestions(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pt-6 md:pt-10 pb-16 md:pb-24">
        <div
          className="flex flex-col items-center mb-8 juris-rise"
          style={{ animationDelay: '60ms' }}
        >
          <h1 className="text-2xl md:text-3xl leading-none text-[#0a2520] font-normal tracking-tight text-center">
            Caio, o que deseja consultar?
          </h1>
          {attachedFiles.length === 0 ? (
            <p className="text-[13px] text-gray-400 mt-3 text-center">
              Anexe <strong>2 ou mais arquivos</strong> (.ofx, .csv, .xlsx) para iniciar a conciliação.
            </p>
          ) : (
            <p className="text-[13px] text-[#0d9488] mt-3">
              {attachedFiles.length} arquivo(s) prontos — clique em Enviar para iniciar a conciliação.
            </p>
          )}
        </div>

        {/* Drag-and-drop zone */}
        <div
          ref={dropZoneRef}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-4 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#0d9488] bg-teal-50/60'
              : attachedFiles.length > 0
                ? 'border-gray-200 bg-gray-50/40 hover:border-[#0d9488]/40'
                : 'border-gray-200 bg-gray-50/40 hover:border-[#0d9488]/40 hover:bg-teal-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.qfx,.csv,.xlsx,.xls,.txt,.pdf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
          <p className="text-[13px] text-gray-500 font-medium">
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
          </p>
          <p className="text-[11.5px] text-gray-400 mt-1">
            Suporta .ofx, .csv, .xlsx, .txt, .pdf · Qualquer quantidade de fontes
          </p>
        </div>

        {/* Attached file chips */}
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap juris-rise">
            {attachedFiles.map((file, i) => {
              const color = FILE_COLORS[i % FILE_COLORS.length];
              const ext = file.name.split('.').pop()?.toLowerCase() ?? 'unknown';
              return (
                <div
                  key={file.name}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] border"
                  style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-medium truncate max-w-[160px]">{file.name}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${color}25` }}
                  >
                    {EXT_LABEL[ext] ?? ext.toUpperCase()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                    className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Error / info message */}
        {errorMsg && (
          <div className="flex items-center gap-2 mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat box */}
        <div
          className={`juris-rise juris-focus bg-white rounded-2xl shadow-[0_10px_30px_-12px_rgb(10,37,32,0.12)] border transition-all duration-300 ${
            isListening
              ? 'border-[#0d9488]/60 shadow-[0_18px_40px_-16px_rgb(13,148,136,0.35)]'
              : 'border-gray-200/80 focus-within:shadow-[0_18px_40px_-16px_rgb(13,148,136,0.25)] focus-within:border-[#0d9488]/40'
          }`}
          style={{ animationDelay: '160ms' }}
        >
          <div className="px-3 md:px-5 pt-3 md:pt-4 pb-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); autoResize(); }}
              rows={1}
              disabled={isListening || processing}
              placeholder={
                isListening
                  ? 'Escutando…'
                  : processing
                    ? stepLabel
                    : canSend
                      ? 'Descreva o período ou conta (opcional)…'
                      : 'Descreva sua consulta contábil...'
              }
              className={`w-full resize-none text-[15px] text-gray-800 placeholder:text-gray-400 leading-relaxed focus:outline-none bg-transparent max-h-48 overflow-y-auto disabled:cursor-default ${
                isListening ? 'juris-caret placeholder:text-[#0d9488] placeholder:font-medium' : ''
              }`}
            />
          </div>
          <div className="flex items-center justify-between px-2 md:px-3 py-2 md:py-2.5 gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#0d9488] hover:bg-gray-50 transition-colors disabled:opacity-40"
                aria-label="Anexar"
              >
                <Paperclip className="w-[16px] h-[16px]" />
              </button>
              <button className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full border border-gray-200 text-[12.5px] text-gray-600 hover:border-[#0d9488]/40 hover:text-[#0a2520] transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-[#0d9488]" />
                Consultar
              </button>
              <button className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-gray-400 hover:text-[#0d9488] hover:bg-gray-50 transition-colors" aria-label="Configurações">
                <Settings className="w-[16px] h-[16px]" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {!isListening && !processing && (
                <>
                  <span className="hidden lg:flex items-center gap-1 text-[11px] text-gray-400 pr-2">
                    <Command className="w-3 h-3" /> + Enter
                  </span>
                  <button
                    onClick={() => setIsListening(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#0d9488] hover:bg-gray-50 transition-colors"
                    aria-label="Ditar"
                  >
                    <Mic className="w-[16px] h-[16px]" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                      canSend
                        ? 'bg-[#0d9488] text-white shadow-md scale-100 hover:bg-[#0a7a70]'
                        : 'bg-[#0a2520]/90 text-white'
                    }`}
                    aria-label="Enviar"
                  >
                    <SendHorizonal className="w-[16px] h-[16px]" />
                  </button>
                </>
              )}
              {processing && (
                <div className="flex items-center gap-2 pr-1">
                  <span className="text-[12px] text-[#0d9488]">{stepLabel}</span>
                  <Loader2 className="w-4 h-4 text-[#0d9488] animate-spin" />
                </div>
              )}
              {isListening && (
                <>
                  <div className="hidden sm:flex items-end gap-[3px] h-5 pr-2" aria-hidden>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-[#0d9488]/70 juris-wave"
                        style={{ animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setIsListening(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors active:scale-95"
                    aria-label="Cancelar gravação"
                  >
                    <Square className="w-[14px] h-[14px] fill-current" />
                  </button>
                  <button
                    onClick={() => setIsListening(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-[#0d9488] to-[#0a4540] text-white shadow-[0_6px_16px_-6px_rgba(13,148,136,0.6)] transition-all active:scale-95"
                    aria-label="Confirmar"
                  >
                    <Check className="w-[16px] h-[16px]" strokeWidth={3} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Simulated AI response */}
        {simulatedResponse && simulatedQuery && (
          <SimulatedResponseCard
            query={simulatedQuery}
            response={simulatedResponse}
            onClose={() => { setSimulatedResponse(null); setSimulatedQuery(null); setShowSuggestions(true); }}
          />
        )}

        {/* Suggestions panel */}
        {showSuggestions && !processing && !simulatedResponse && (
          <div
            className="mt-5 juris-rise rounded-2xl border border-gray-200/70 bg-gray-50/60 shadow-[0_1px_2px_rgba(10,37,32,0.04)] overflow-hidden"
            style={{ animationDelay: '260ms' }}
          >
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[12.5px] text-gray-500">
                <Sparkles className="w-3.5 h-3.5 text-[#0d9488]" strokeWidth={1.8} />
                <span>Experimente a Numera</span>
              </div>
              <button
                onClick={() => setShowSuggestions(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                aria-label="Fechar sugestões"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>

            <div className="h-px bg-gray-200/70" />

            <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-full border transition-all ${
                      active
                        ? 'bg-white text-[#0a2520] border-gray-300 shadow-[0_1px_2px_rgba(10,37,32,0.06)]'
                        : 'bg-transparent text-gray-500 border-transparent hover:bg-white/70 hover:text-[#0a2520]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#0d9488]' : ''}`} strokeWidth={1.8} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-gray-200/70" />

            <div className="px-4 py-1 flex flex-col divide-y divide-gray-200/60">
              {current.suggestions.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestionClick(s)}
                  className="group w-full text-left flex items-center justify-between gap-4 py-2.5 text-[13.5px] text-gray-600 hover:text-[#0a2520] transition-colors juris-rise"
                  style={{ animationDelay: `${i * 50}ms`, animationDuration: '0.35s' }}
                >
                  <span className="leading-snug flex items-center gap-2">
                    {s.action === 'reconcile' && attachedFiles.length > 0 && (
                      <Banknote className="w-3.5 h-3.5 text-[#0d9488] shrink-0" />
                    )}
                    {s.label}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0d9488] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  );
}
