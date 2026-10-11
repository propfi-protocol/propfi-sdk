import { scValToNative } from '@stellar/stellar-sdk';
import type { xdr } from '@stellar/stellar-sdk';

/**
 * Parsed event with decoded topics and data.
 */
export interface ParsedEvent {
  /** Event type identifier */
  type: string;
  /** Decoded event topics */
  topics: string[];
  /** Decoded event data */
  data: Record<string, unknown>;
}

/**
 * Raw contract event from transaction results.
 */
export interface ContractEvent {
  /** Contract ID that emitted the event */
  contractId: string;
  /** Raw event topics */
  topics: xdr.ScVal[];
  /** Raw event data */
  data: xdr.ScVal;
}

/**
 * Interface for diagnostic events from simulation results.
 */
export interface DiagnosticEventLike {
  /** Get event topics */
  topics(): xdr.ScVal[];
  /** Get event data */
  data(): xdr.ScVal;
}

/**
 * Parse a diagnostic event into a typed structure.
 * @param event - Diagnostic event from simulation
 * @returns Parsed event with decoded topics and data
 */
export function parseDiagnosticEvent(event: DiagnosticEventLike): ParsedEvent {
  const topics = event.topics().map(topic => scValToNative(topic) as string);
  const data = scValToNative(event.data()) as Record<string, unknown>;

  return {
    type: 'diagnostic',
    topics,
    data,
  };
}

/**
 * Parse multiple diagnostic events.
 * @param events - Array of diagnostic events
 * @returns Array of parsed events
 */
export function parseContractEvents(events: DiagnosticEventLike[]): ParsedEvent[] {
  return events.map(parseDiagnosticEvent);
}

/**
 * Find the first event matching a topic.
 * @param events - Array of parsed events
 * @param topic - Topic to search for
 * @returns First matching event or undefined
 */
export function findEventByTopic(events: ParsedEvent[], topic: string): ParsedEvent | undefined {
  return events.find(event => event.topics[0] === topic);
}

/**
 * Find all events matching a topic.
 * @param events - Array of parsed events
 * @param topic - Topic to search for
 * @returns Array of matching events
 */
export function findEventsByTopic(events: ParsedEvent[], topic: string): ParsedEvent[] {
  return events.filter(event => event.topics[0] === topic);
}

/**
 * Extract typed data from a parsed event.
 * @template T - Expected data type
 * @param event - Parsed event
 * @returns Event data cast to type T
 */
export function extractEventData<T>(event: ParsedEvent): T {
  return event.data as T;
}

/**
 * Parse event topics from XDR ScVal array.
 * @param topics - Raw XDR topics
 * @returns Decoded topic strings
 */
export function parseEventTopics(topics: xdr.ScVal[]): string[] {
  return topics.map(topic => scValToNative(topic) as string);
}

/**
 * Decode event data from XDR ScVal.
 * @param data - Raw XDR data
 * @returns Decoded value
 */
export function decodeEventData(data: xdr.ScVal): unknown {
  return scValToNative(data);
}

/**
 * Known event topic constants for PropFi contracts.
 */
export const EventTopics = {
  /** Emitted when a property is registered */
  PROPERTY_REGISTERED: 'PropertyRegistered',
  /** Emitted when property ownership is transferred */
  PROPERTY_TRANSFERRED: 'PropertyTransferred',
  /** Emitted when property status changes */
  PROPERTY_STATUS_CHANGED: 'PropertyStatusChanged',
  /** Emitted when property valuation is updated */
  VALUATION_UPDATED: 'ValuationUpdated',
  /** Emitted when a property is fractionalized */
  FRACTIONALIZED: 'Fractionalized',
  /** Emitted when a fraction is purchased */
  FRACTION_PURCHASED: 'FractionPurchased',
  /** Emitted when a fraction is sold */
  FRACTION_SOLD: 'FractionSold',
  /** Emitted when rent is distributed */
  RENT_DISTRIBUTED: 'RentDistributed',
  /** Emitted when a loan is opened */
  LOAN_OPENED: 'LoanOpened',
  /** Emitted when a loan is repaid */
  LOAN_REPAID: 'LoanRepaid',
  /** Emitted when a loan is liquidated */
  LOAN_LIQUIDATED: 'LoanLiquidated',
  /** Emitted when liquidity is deposited */
  LIQUIDITY_DEPOSITED: 'LiquidityDeposited',
  /** Emitted when liquidity is withdrawn */
  LIQUIDITY_WITHDRAWN: 'LiquidityWithdrawn',
  /** Emitted when an attestation is created */
  ATTESTATION_CREATED: 'AttestationCreated',
  /** Emitted when an attestation is revoked */
  ATTESTATION_REVOKED: 'AttestationRevoked',
  /** Emitted when jurisdiction rules are set */
  JURISDICTION_RULES_SET: 'JurisdictionRulesSet',
  /** Emitted when a governance proposal is created */
  PROPOSAL_CREATED: 'ProposalCreated',
  /** Emitted when a governance proposal is executed */
  PROPOSAL_EXECUTED: 'ProposalExecuted',
  /** Emitted when a vote is cast */
  VOTE_CAST: 'VoteCast',
} as const;

/** Union type of all known event topics */
export type EventTopic = (typeof EventTopics)[keyof typeof EventTopics];

/**
 * Check if a string is a known event topic.
 * @param topic - Topic string to check
 * @returns True if the topic is a known EventTopic
 */
export function isEventTopic(topic: string): topic is EventTopic {
  return Object.values(EventTopics).includes(topic as EventTopic);
}
