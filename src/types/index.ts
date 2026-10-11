/**
 * Property status enum representing the current state of a property.
 */
export enum PropertyStatus {
  /** Property is active and available for transactions */
  Active = 'Active',
  /** Property is inactive and not available for transactions */
  Inactive = 'Inactive',
  /** Property is under maintenance */
  UnderMaintenance = 'UnderMaintenance',
}

/**
 * Loan status enum representing the current state of a loan.
 */
export enum LoanStatus {
  /** Loan is active and accruing interest */
  Active = 'Active',
  /** Loan has been fully repaid */
  Repaid = 'Repaid',
  /** Loan has been liquidated */
  Liquidated = 'Liquidated',
}

/**
 * Data structure representing a property in the registry.
 */
export interface PropertyData {
  /** Stellar address of the property owner */
  owner: string;
  /** Current valuation of the property in base units */
  valuation: bigint;
  /** Hash of the property documentation */
  doc_hash: string;
  /** Current status of the property */
  status: PropertyStatus;
  /** Unix timestamp when the property was created */
  created_at: number;
  /** Unix timestamp when the property was last updated */
  updated_at: number;
}

/**
 * Price data from an oracle.
 */
export interface PriceData {
  /** Price in base units */
  price: bigint;
  /** Unix timestamp of the price */
  timestamp: number;
  /** Number of oracles that provided this price */
  oracle_count: number;
}

/**
 * Data structure representing a loan in the mortgage pool.
 */
export interface LoanData {
  /** Property ID associated with the loan */
  prop_id: number;
  /** Stellar address of the borrower */
  borrower: string;
  /** Loan amount in base units */
  amount: bigint;
  /** Collateral valuation in base units */
  collateral_valuation: bigint;
  /** Loan-to-value ratio in basis points */
  ltv_bps: number;
  /** Interest rate in basis points */
  interest_rate_bps: number;
  /** Unix timestamp when the loan was created */
  created_at: number;
  /** Unix timestamp of the last repayment */
  last_repayment_at: number;
  /** Current status of the loan */
  status: LoanStatus;
}

/**
 * Health factor of a loan indicating its collateralization level.
 */
export interface HealthFactor {
  /** Health ratio (1.0 = 100% collateralized) */
  ratio: number;
  /** Whether the loan is considered healthy (ratio >= 1.0) */
  is_healthy: boolean;
}

/**
 * Jurisdiction-specific compliance rules.
 */
export interface JurisdictionRules {
  /** Minimum number of days an attestation must be valid */
  min_attestation_days: number;
  /** Required compliance level (1-5) */
  required_level: number;
}

/**
 * Quote for a token swap path.
 */
export interface PathQuote {
  /** Destination amount in base units */
  dest_amount: bigint;
  /** Array of contract IDs in the swap path */
  path: string[];
  /** Estimated fee in base units */
  estimated_fee: bigint;
}

/**
 * Information about a fractionalized property.
 */
export interface FractionInfo {
  /** Total supply of fractions in base units */
  total_supply: bigint;
  /** Price per fraction in base units */
  price: bigint;
  /** Payment token contract ID */
  payment_token: string;
  /** Property registry contract ID */
  property_registry: string;
  /** Compliance registry contract ID */
  compliance_registry: string;
}

/**
 * Attestation data for a user.
 */
export interface Attestation {
  /** Hash of the proof document */
  proof_hash: string;
  /** Jurisdiction of the attestation */
  jurisdiction: string;
  /** Unix timestamp when the attestation expires */
  expiry: number;
  /** Whether the attestation is currently active */
  active: boolean;
}

/**
 * Governance proposal data.
 */
export interface ProposalData {
  /** Stellar address of the proposer */
  proposer: string;
  /** Type of action this proposal performs */
  action_type: number;
  /** Encoded calldata for the action */
  calldata: string;
  /** Human-readable description of the proposal */
  description: string;
  /** Unix timestamp when the proposal was created */
  created_at: number;
  /** Unix timestamp when voting ends */
  voting_end: number;
  /** Whether the proposal has been executed */
  executed: boolean;
  /** Votes in favor */
  for_votes: bigint;
  /** Votes against */
  against_votes: bigint;
  /** Quorum required for execution */
  quorum: bigint;
}

/**
 * Parsed event entry from a contract.
 */
export interface EventEntry {
  /** Event topics for filtering */
  topic: string[];
  /** Event data as key-value pairs */
  data: Record<string, unknown>;
}

/**
 * Soroban contract reference.
 */
export interface SorobanContract {
  /** Contract ID */
  contractId: string;
  /** RPC URL for the contract */
  rpcUrl: string;
}

/**
 * Transaction options for customizing fee and timeout.
 */
export interface TxOptions {
  /** Transaction fee in stroops (default: 100) */
  fee?: number;
  /** Transaction timeout in seconds (default: 30) */
  timeoutInSeconds?: number;
}
