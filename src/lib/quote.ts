import { first } from 'lodash-es';
import type { QuoteRequest, QuoteResponse } from './types';
import { fetchQuoteOneInch } from './aggregators/oneInch';

export async function fetchDepositQuote(req: QuoteRequest): Promise<QuoteResponse> {
  // SingleStrategy: fetch quotes from providers (we use 1inch only here)
  const quotes = await Promise.allSettled([fetchQuoteOneInch(req)]);
  const fulfilled = quotes
    .filter((q): q is PromiseFulfilledResult<QuoteResponse> => q.status === 'fulfilled')
    .map(q => q.value);
  if (!fulfilled.length) throw new Error('No swap quote found');

  // Already sorted would be ideal; here just pick max toAmount
  fulfilled.sort((a, b) => b.toAmount.comparedTo(a.toAmount));
  return first(fulfilled)!;
}
