# @propfi/sdk

TypeScript SDK for the PropFi protocol on Stellar Soroban.

## Installation

```bash
npm install @propfi/sdk
```

## Quick Start

```typescript
import { createPropFi } from '@propfi/sdk';

const propfi = createPropFi({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  complianceRegistryId: 'C...',
  propertyRegistryId: 'C...',
  fractionVaultId: 'C...',
  mortgagePoolId: 'C...',
});
```

## Usage Examples

### Read a property

```typescript
const property = await propfi.propertyRegistry.getProperty(1);
console.log(property.owner, property.valuation);
```

### Check compliance

```typescript
const ok = await propfi.complianceRegistry.isCompliant('G...', 'US');
```

### Submit a transaction (write)

```typescript
import { Keypair } from '@stellar/stellar-sdk';

const keypair = Keypair.fromSecret('S...');
const signer = {
  async getPublicKey() {
    return keypair.publicKey();
  },
  async signTransaction(txXdr: string) {
    return keypair.sign(txXdr);
  },
};

const txHash = await propfi.fractionVault.buyFraction(
  'G...', // buyer
  1, // prop_id
  10n, // amount
  signer
);
```

### Using Freighter wallet

```typescript
import { createPropFi } from '@propfi/sdk';

const propfi = createPropFi({ ... });

const freighterSigner = {
  async getPublicKey() {
    const { publicKey } = await window.freighter.getPublicKey();
    return publicKey;
  },
  async signTransaction(txXdr: string) {
    const { signedTxXdr } = await window.freighter.signTransaction(txXdr, {
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    return signedTxXdr;
  },
};

const txHash = await propfi.complianceRegistry.attest(
  'G...', '0x...', 'US', 365, freighterSigner,
);
```

### Full portfolio query

```typescript
const propId = 1;

const [property, fractionInfo, balance, health] = await Promise.all([
  propfi.propertyRegistry.getProperty(propId),
  propfi.fractionVault.getFractionInfo(propId),
  propfi.fractionVault.getBalance('G...', propId),
  propfi.mortgagePool.loanHealth(1),
]);

console.log({ property, fractionInfo, balance, health });
```

### Register a new property

```typescript
const txHash = await propfi.propertyRegistry.registerProperty(
  'G...',           // owner
  1000000n,         // valuation (in stroops)
  'QmHash...',      // document hash
  'US',             // jurisdiction
  signer
);
```

### Update property valuation (oracle)

```typescript
const txHash = await propfi.propertyRegistry.updateValuation(
  1,                    // propId
  1200000n,             // new valuation
  'CORACLE...',         // oracle contract
  'USDC',               // asset
  signer
);
```

### Open a mortgage loan

```typescript
const txHash = await propfi.mortgagePool.openLoan(
  'G...',           // borrower
  1,                // propId
  500000n,          // amount
  signer
);
```

### Repay a loan

```typescript
const txHash = await propfi.mortgagePool.repay(
  'G...',           // borrower
  1,                // loanId
  100000n,          // amount
  signer
);
```

### Check loan health factor

```typescript
const health = await propfi.mortgagePool.loanHealth(1);
console.log(`Health ratio: ${health.ratio}, Healthy: ${health.is_healthy}`);
```

### Deposit liquidity to mortgage pool

```typescript
const txHash = await propfi.mortgagePool.depositLiquidity(
  'G...',           // LP address
  1000000n,         // amount
  signer
);
```

### Using Transaction Simulator for fee estimation

```typescript
import { createTransactionSimulator } from '@propfi/sdk';

const simulator = createTransactionSimulator(
  'https://soroban-testnet.stellar.org',
  'CABC...', // contract ID
);

// Simulate a view call
const result = await simulator.simulateView('get_property', [
  nativeToScVal(1, { type: 'u64' })
]);

// Estimate fee for a transaction
const simulation = await simulator.simulate(
  'buy_fraction',
  [
    nativeToScVal('G...', { type: 'address' }),
    nativeToScVal(1, { type: 'u64' }),
    nativeToScVal(10n, { type: 'u128' }),
  ],
  'G...' // source account
);

console.log(`Estimated fee: ${simulation.estimatedFee} stroops`);
console.log(`Min resource fee: ${simulation.minResourceFee} stroops`);
```

### Batch/multi-call transactions

```typescript
import { createBatchBuilder, MultiCallClient } from '@propfi/sdk';

// Build a batch transaction
const batchBuilder = createBatchBuilder({ fee: '200' });
batchBuilder
  .addOperation('CABC...', 'method1', [param1, param2])
  .addOperation('CDEF...', 'method2', [param3]);

const tx = batchBuilder.build(sourceAccount);

// Or use MultiCallClient for full execution
const multiCall = new MultiCallClient({
  rpcUrl: 'https://soroban-testnet.stellar.org',
});

const operations = [
  { contractId: 'CABC...', method: 'buy_fraction', args: [buyer, propId, amount] },
  { contractId: 'CDEF...', method: 'sell_fraction', args: [seller, propId, amount] },
];

const txHash = await multiCall.executeBatch(operations, signer);
```

### Error handling with custom error types

```typescript
import {
  createPropFi,
  SimulationError,
  TransactionError,
  ContractError,
  ValidationError,
  assertValidAddress,
} from '@propfi/sdk';

try {
  const property = await propfi.propertyRegistry.getProperty(999);
} catch (error) {
  if (error instanceof SimulationError) {
    console.error('Simulation failed:', error.message);
  } else if (error instanceof TransactionError) {
    console.error('Transaction failed:', error.message, 'Tx:', error.txHash);
  } else if (error instanceof ContractError) {
    console.error('Contract error:', error.contractId, error.method);
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.field, error.value);
  }
}

// Validate inputs before calling
assertValidAddress('GABC...', 'owner'); // throws ValidationError if invalid
```

### Event parsing from transaction results

```typescript
import { parseContractEvents, EventTopics, findEventByTopic } from '@propfi/sdk';

const simulation = await simulator.simulate(...);
const events = parseContractEvents(simulation.events);

const propertyRegistered = findEventByTopic(events, EventTopics.PROPERTY_REGISTERED);
if (propertyRegistered) {
  const { propId, owner } = propertyRegistered.data;
  console.log(`Property ${propId} registered by ${owner}`);
}

const fractionPurchased = findEventByTopic(events, EventTopics.FRACTION_PURCHASED);
if (fractionPurchased) {
  const { buyer, amount, propId } = fractionPurchased.data;
  console.log(`${buyer} bought ${amount} fractions of property ${propId}`);
}
```

### Input validation

```typescript
import {
  validateContractId,
  validateAccountId,
  validatePositiveBigInt,
  validateAll,
  createConfigValidator,
} from '@propfi/sdk';

// Validate individual inputs
const contractResult = validateContractId('CABC...'); // { valid: true, value: 'CABC...' }
const accountResult = validateAccountId('GABC...');   // { valid: true, value: 'GABC...' }
const amountResult = validatePositiveBigInt(100n, 'amount'); // { valid: true, value: 100n }

// Validate config object
const validator = createConfigValidator();
const configResult = validateAll({
  rpcUrl: 'https://rpc.example.com',
  contractId: 'CABC...',
}, validator);
```

## Clients

| Client                     | Contract              | Key Methods                                            |
| -------------------------- | --------------------- | ------------------------------------------------------ |
| `ComplianceRegistryClient` | KYC/AML attestation   | `attest`, `isCompliant`, `revoke`, `setJurisdictionRules`, `attestationExpiry` |
| `PropertyRegistryClient`   | Property tokenization | `registerProperty`, `getProperty`, `transferOwnership`, `updateValuation`, `setStatus`, `getPropertyJurisdiction` |
| `FractionVaultClient`      | Fractional ownership  | `buyFraction`, `sellFraction`, `getBalance`, `totalHolders`, `getFractionInfo`, `setRentDistributor` |
| `MortgagePoolClient`       | On-chain mortgages    | `openLoan`, `repay`, `liquidate`, `depositLiquidity`, `withdrawLiquidity`, `loanHealth` |

## Core Utilities

| Utility | Description |
|---------|-------------|
| `createPropFi(config)` | Factory function to create the full SDK |
| `createTransactionSimulator(rpcUrl, contractId, networkPassphrase?)` | Create a transaction simulator for fee estimation |
| `createBatchBuilder(config?)` | Create a batch transaction builder |
| `MultiCallClient` | Execute multiple contract calls in a single transaction |

## Error Types

| Error Class | Code | Description |
|-------------|------|-------------|
| `PropFiError` | - | Base error class |
| `SimulationError` | `SIMULATION_ERROR` | Transaction simulation failed |
| `TransactionError` | `TRANSACTION_ERROR` | Transaction submission failed |
| `ContractError` | `CONTRACT_ERROR` | Contract call preparation failed |
| `ValidationError` | `VALIDATION_ERROR` | Input validation failed |
| `NetworkError` | `NETWORK_ERROR` | RPC network error |
| `SignerError` | `SIGNER_ERROR` | Transaction signing failed |
| `ConfigurationError` | `CONFIGURATION_ERROR` | SDK configuration error |

## Types

The SDK exports all protocol types:
- `PropertyData`, `FractionInfo`, `LoanData`, `HealthFactor`, `Attestation`, `ProposalData`, `JurisdictionRules`, `PriceData`
- Enums: `PropertyStatus` (Active, Inactive, UnderMaintenance), `LoanStatus` (Active, Repaid, Liquidated)
- `TxOptions`, `PathQuote`, `SorobanContract`, `SorobanSigner`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run fmt
```

## License

MIT