import { extractTokensFromPdf } from './pdf-token-extractor';
import { parseViacrediInvestmentStatementTextTokens } from './viacredi-investment-statement-parser';
import { parseViacrediStatementTextTokens } from './viacredi-statement-parser';
import type { ViacrediInvestmentStatement, ViacrediStatement } from './types';
import { normalizeText } from './questor-utils';

export type ParsedViacrediPdf =
  | {
      type: 'checking_statement';
      statement: ViacrediStatement;
      fileName?: string;
    }
  | {
      type: 'investment_statement';
      statement: ViacrediInvestmentStatement;
      fileName?: string;
    };

export function parseViacrediDocumentTextTokens(tokens: string[], fileName?: string): ParsedViacrediPdf {
  const joined = normalizeText(tokens.join(' '));

  if (joined.includes('extrato aplicacao programada')) {
    return {
      type: 'investment_statement',
      statement: parseViacrediInvestmentStatementTextTokens(tokens),
      fileName,
    };
  }

  return {
    type: 'checking_statement',
    statement: parseViacrediStatementTextTokens(tokens),
    fileName,
  };
}

export async function parseViacrediDocumentPdf(file: File): Promise<ParsedViacrediPdf> {
  console.log(`[Viacredi Parser] Iniciando extração de tokens do PDF: ${file.name}`);
  try {
    const tokens = await extractTokensFromPdf(file);
    console.log(`[Viacredi Parser] Tokens extraídos com sucesso: ${tokens.length} tokens`, tokens.slice(0, 20));
    const result = parseViacrediDocumentTextTokens(tokens, file.name);
    console.log(`[Viacredi Parser] Parsing bem-sucedido, tipo: ${result.type}`);
    return result;
  } catch (e) {
    console.error(`[Viacredi Parser] Erro ao processar PDF ${file.name}:`, e);
    throw e;
  }
}
