import BigNumber from 'bignumber.js';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const ONEINCH_NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

// Hardcoded sender/recipient addresses for 1inch swaps (should be the same for each network)
export const ONEINCH_SWAP_ADDRESSES: Record<string, `0x${string}`> = {
  ethereum: '0xE82343A116d2179F197111D92f9B53611B43C01c',
  bsc: '0xE82343A116d2179F197111D92f9B53611B43C01c',
  polygon: '0xE82343A116d2179F197111D92f9B53611B43C01c',
  arbitrum: '0xE82343A116d2179F197111D92f9B53611B43C01c',
  optimism: '0xE82343A116d2179F197111D92f9B53611B43C01c',
  avalanche: '0xE82343A116d2179F197111D92f9B53611B43C01c',
  fantom: '0xE82343A116d2179F197111D92f9B53611B43C01c',
  base: '0xE82343A116d2179F197111D92f9B53611B43C01c',
};

export function toWeiString(value: BigNumber, decimals: number): string {
  return value.shiftedBy(decimals).decimalPlaces(0, BigNumber.ROUND_FLOOR).toFixed();
}

export function fromWei(value: string, decimals: number): BigNumber {
  return new BigNumber(value).shiftedBy(-decimals);
}

export function slipBy(amount: BigNumber, slippage: number, decimals: number): BigNumber {
  // slippage in decimal (e.g. 0.01 = 1%)
  const one = new BigNumber(1);
  const factor = one.minus(slippage);
  const res = amount.multipliedBy(factor);
  return res.decimalPlaces(decimals, BigNumber.ROUND_FLOOR);
}

export function getInsertIndex(n: number) {
  return 4 + n * 32;
}

export function toOneInchAddress(address: `0x${string}`): string {
  // 1inch uses 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for native tokens, while we use 0x0000... internally
  return address === ZERO_ADDRESS ? ONEINCH_NATIVE_ADDRESS : address;
}
