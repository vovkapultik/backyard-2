# Backyard-2: SingleStrategy Deposit Demo

A React TypeScript application that demonstrates the Beefy SingleStrategy deposit flow by replicating the exact logic from `fetchDepositQuote` and `fetchDepositStep`.

## Features

1. **Vault Loading**: Fetch vault data by ID from Beefy's backend API
2. **Token Discovery**: Show tokens in user's wallet on the vault's network
3. **Quote Fetching**: Get swap quotes using the same logic as SingleStrategy
4. **Step Building**: Build complete zap order and steps (dry-run, no wallet execution)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the environment file (optional):
```bash
cp env.example .env
```

3. Start the development server:
```bash
npm run dev
```

## Usage

1. **Load a Vault**: Enter a vault ID (e.g., `cakev2-cake-bnb`) and click "Load Vault"
2. **Connect Wallet**: Click "Connect Wallet" to connect your MetaMask/wallet
3. **Scan Tokens**: Click "Scan Wallet Tokens" to find tokens with balance on the vault's chain
4. **Get Quote**: Select a token, enter amount, and click "Get Quote"
5. **Build Deposit**: Click "Build Deposit Step" to see the complete zap order

## Architecture

The app replicates Beefy's SingleStrategy logic:

- `src/lib/quote.ts` - Implements `fetchDepositQuote` logic
- `src/lib/step.ts` - Implements `fetchDepositStep` logic  
- `src/lib/aggregators/` - 1inch swap provider via Beefy's zap API (can add more)
- `src/lib/beefy.ts` - Beefy API integration
- `src/lib/erc20.ts` - Token metadata and balance reading
- `src/lib/chains.ts` - Multi-chain RPC configuration

## Supported Chains

- Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom, Base

## Note

This is a **dry-run** application. It builds the complete `UserlessZapRequest` that would be passed to `zapExecuteOrder()` in production, but does not execute any transactions.

## Example Vaults to Try

- `cakev2-cake-bnb` (BSC)
- `aave-usdc` (Ethereum) 
- `curve-poly-am3crv` (Polygon)

Make sure you have tokens with balance on the respective chains!
