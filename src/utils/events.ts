import { scValToNative } from '@stellar/stellar-sdk';
import type { xdr } from '@stellar/stellar-sdk';

export interface ParsedEvent {
  type: string;
  topics: string[];
  data: Record<string, unknown>;
}

export interface ContractEvent {
  contractId: string;
  topics: xdr.ScVal[];
  data: xdr.ScVal;
}

export interface DiagnosticEventLike {
  topics(): xdr.ScVal[];
  data(): xdr.ScVal;
}

export function parseDiagnosticEvent(event: DiagnosticEventLike): ParsedEvent {
  const topics = event.topics().map(topic => scValToNative(topic) as string);
  const data = scValToNative(event.data()) as Record<string, unknown>;

  return {
    type: 'diagnostic',
    topics,
    data,
  };
}

export function parseContractEvents(events: DiagnosticEventLike[]): ParsedEvent[] {
  return events.map(parseDiagnosticEvent);
}

export function findEventByTopic(events: ParsedEvent[], topic: string): ParsedEvent | undefined {
  return events.find(event => event.topics[0] === topic);
}

export function findEventsByTopic(events: ParsedEvent[], topic: string): ParsedEvent[] {
  return events.filter(event => event.topics[0] === topic);
}

export function extractEventData<T>(event: ParsedEvent): T {
  return event.data as T;
}

export function parseEventTopics(topics: xdr.ScVal[]): string[] {
  return topics.map(topic => scValToNative(topic) as string);
}

export function decodeEventData(data: xdr.ScVal): unknown {
  return scValToNative(data);
}

export const EventTopics = {
  PROPERTY_REGISTERED: 'PropertyRegistered',
  PROPERTY_TRANSFERRED: 'PropertyTransferred',
  PROPERTY_STATUS_CHANGED: 'PropertyStatusChanged',
  VALUATION_UPDATED: 'ValuationUpdated',
  FRACTIONALIZED: 'Fractionalized',
  FRACTION_PURCHASED: 'FractionPurchased',
  FRACTION_SOLD: 'FractionSold',
  RENT_DISTRIBUTED: 'RentDistributed',
  LOAN_OPENED: 'LoanOpened',
  LOAN_REPAID: 'LoanRepaid',
  LOAN_LIQUIDATED: 'LoanLiquidated',
  LIQUIDITY_DEPOSITED: 'LiquidityDeposited',
  LIQUIDITY_WITHDRAWN: 'LiquidityWithdrawn',
  ATTESTATION_CREATED: 'AttestationCreated',
  ATTESTATION_REVOKED: 'AttestationRevoked',
  JURISDICTION_RULES_SET: 'JurisdictionRulesSet',
  PROPOSAL_CREATED: 'ProposalCreated',
  PROPOSAL_EXECUTED: 'ProposalExecuted',
  VOTE_CAST: 'VoteCast',
} as const;

export type EventTopic = (typeof EventTopics)[keyof typeof EventTopics];

export function isEventTopic(topic: string): topic is EventTopic {
  return Object.values(EventTopics).includes(topic as EventTopic);
}
