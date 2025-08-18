import BigNumber from 'bignumber.js';
import type { QuoteRequest, QuoteResponse, SwapResponse } from '../types';
import { toWeiString, slipBy, toOneInchAddress } from '../utils';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.beefy.finance';
const API_ZAP_URL = import.meta.env.VITE_API_ZAP_URL || `${API_URL}/zap`;

export async function fetchQuoteOneInch(req: QuoteRequest): Promise<QuoteResponse> {
  const url = `${API_ZAP_URL}/providers/oneinch/${req.vault.chainId}/quote`;
  const srcAddress = toOneInchAddress(req.fromToken.address);
  const dstAddress = toOneInchAddress(req.toToken.address);
  
  console.log('1inch quote:', {
    from: `${req.fromToken.address} -> ${srcAddress}`,
    to: `${req.toToken.address} -> ${dstAddress}`,
    amount: req.fromAmount.toString()
  });
  
  const params = new URLSearchParams({
    src: srcAddress,
    dst: dstAddress,
    amount: toWeiString(req.fromAmount, req.fromToken.decimals),
  });
  
  const res = await fetch(`${url}?${params}`);
  if (!res.ok) throw new Error(`Beefy 1inch quote failed: ${await res.text()}`);
  const data = await res.json();
  
  return {
    providerId: 'one-inch',
    fromToken: req.fromToken,
    fromAmount: req.fromAmount,
    toToken: req.toToken,
    toAmount: new BigNumber(data.dstAmount).shiftedBy(-req.toToken.decimals),
  };
}

export async function fetchSwapOneInch(
  quote: QuoteResponse,
  fromAddress: `0x${string}`,
  slippage: number
): Promise<SwapResponse> {
  const url = `${API_ZAP_URL}/providers/oneinch/${quote.fromToken.chainId}/swap`;
  const srcAddress = toOneInchAddress(quote.fromToken.address);
  const dstAddress = toOneInchAddress(quote.toToken.address);
  
  console.log('1inch swap:', {
    from: `${quote.fromToken.address} -> ${srcAddress}`,
    to: `${quote.toToken.address} -> ${dstAddress}`,
    routerFrom: fromAddress,
    amount: quote.fromAmount.toString(),
    slippage: slippage * 100
  });
  
  const qs = new URLSearchParams({
    from: fromAddress,
    src: srcAddress,
    dst: dstAddress,
    amount: toWeiString(quote.fromAmount, quote.fromToken.decimals),
    slippage: String(slippage * 100),
    disableEstimate: 'true',
  });
  
  const res = await fetch(`${url}?${qs}`);
  if (!res.ok) throw new Error(`Beefy 1inch swap failed: ${await res.text()}`);
  const data = await res.json();
  
  const dst = new BigNumber(data.dstAmount).shiftedBy(-quote.toToken.decimals);
  return {
    providerId: 'one-inch',
    fromToken: quote.fromToken,
    fromAmount: quote.fromAmount,
    toToken: quote.toToken,
    toAmount: dst,
    toAmountMin: slipBy(dst, slippage, quote.toToken.decimals),
    tx: {
      fromAddress: data.tx.from,
      toAddress: data.tx.to,
      data: data.tx.data,
      value: data.tx.value,
      inputPosition: -1,
    },
  };
}
