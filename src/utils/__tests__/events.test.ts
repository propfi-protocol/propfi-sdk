import { describe, it, expect, vi } from 'vitest';
import {
  parseDiagnosticEvent,
  parseContractEvents,
  findEventByTopic,
  findEventsByTopic,
  extractEventData,
  parseEventTopics,
  decodeEventData,
  EventTopics,
  isEventTopic,
} from '../../utils/events';
import type { ParsedEvent, DiagnosticEventLike } from '../../utils/events';
import type { xdr } from '@stellar/stellar-sdk';

vi.mock('@stellar/stellar-sdk', async () => {
  const actual = await vi.importActual('@stellar/stellar-sdk');
  return {
    ...actual,
    scValToNative: vi.fn(val => {
      if (val && typeof val === 'object' && 'value' in val) {
        return (val as any).value;
      }
      return val;
    }),
    xdr: actual['xdr'],
  };
});

describe('Event Utilities', () => {
  const createMockScVal = (value: unknown) =>
    ({
      value,
    }) as unknown as xdr.ScVal;

  const createMockEvent = (
    topics: string[],
    data: Record<string, unknown>
  ): DiagnosticEventLike => {
    const topicVals = topics.map(t => createMockScVal(t));
    return {
      topics: () => topicVals,
      data: () => createMockScVal(data),
    };
  };

  describe('parseDiagnosticEvent', () => {
    it('should parse event with topics and data', () => {
      const event = createMockEvent(['PropertyRegistered', 'prop1'], {
        owner: 'GABC...',
        valuation: 1000000n,
      });

      const parsed = parseDiagnosticEvent(event);

      expect(parsed.type).toBe('diagnostic');
      expect(parsed.topics).toEqual(['PropertyRegistered', 'prop1']);
      expect(parsed.data).toEqual({ owner: 'GABC...', valuation: 1000000n });
    });

    it('should handle empty topics', () => {
      const event = createMockEvent([], { message: 'test' });

      const parsed = parseDiagnosticEvent(event);

      expect(parsed.topics).toEqual([]);
    });
  });

  describe('parseContractEvents', () => {
    it('should parse multiple events', () => {
      const events = [
        createMockEvent(['PropertyRegistered'], { propId: 1 }),
        createMockEvent(['FractionPurchased'], { buyer: 'GABC...', amount: 100n }),
      ];

      const parsed = parseContractEvents(events);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]?.topics[0]).toBe('PropertyRegistered');
      expect(parsed[1]?.topics[0]).toBe('FractionPurchased');
    });
  });

  describe('findEventByTopic', () => {
    it('should find event by topic', () => {
      const events: ParsedEvent[] = [
        { type: 'diagnostic', topics: ['PropertyRegistered'], data: { propId: 1 } },
        { type: 'diagnostic', topics: ['FractionPurchased'], data: { buyer: 'GABC...' } },
      ];

      const found = findEventByTopic(events, 'FractionPurchased');

      expect(found).toBeDefined();
      expect(found?.topics[0]).toBe('FractionPurchased');
    });

    it('should return undefined for non-existent topic', () => {
      const events: ParsedEvent[] = [
        { type: 'diagnostic', topics: ['PropertyRegistered'], data: {} },
      ];

      const found = findEventByTopic(events, 'NonExistent');

      expect(found).toBeUndefined();
    });
  });

  describe('findEventsByTopic', () => {
    it('should find all events with matching topic', () => {
      const events: ParsedEvent[] = [
        { type: 'diagnostic', topics: ['FractionPurchased'], data: { buyer: 'GABC...' } },
        { type: 'diagnostic', topics: ['FractionPurchased'], data: { buyer: 'GDEF...' } },
        { type: 'diagnostic', topics: ['FractionSold'], data: { seller: 'GABC...' } },
      ];

      const found = findEventsByTopic(events, 'FractionPurchased');

      expect(found).toHaveLength(2);
    });
  });

  describe('extractEventData', () => {
    it('should extract typed data from event', () => {
      interface PropertyData {
        propId: number;
        owner: string;
      }

      const event: ParsedEvent = {
        type: 'diagnostic',
        topics: ['PropertyRegistered'],
        data: { propId: 1, owner: 'GABC...' },
      };

      const data = extractEventData<PropertyData>(event);

      expect(data.propId).toBe(1);
      expect(data.owner).toBe('GABC...');
    });
  });

  describe('parseEventTopics', () => {
    it('should parse topics array', () => {
      const topics = [createMockScVal('Topic1'), createMockScVal('Topic2')];

      const parsed = parseEventTopics(topics);

      expect(parsed).toEqual(['Topic1', 'Topic2']);
    });
  });

  describe('decodeEventData', () => {
    it('should decode event data', () => {
      const data = createMockScVal({ key: 'value', amount: 100n });

      const decoded = decodeEventData(data);

      expect(decoded).toEqual({ key: 'value', amount: 100n });
    });
  });

  describe('EventTopics', () => {
    it('should contain all expected event topics', () => {
      expect(EventTopics.PROPERTY_REGISTERED).toBe('PropertyRegistered');
      expect(EventTopics.FRACTION_PURCHASED).toBe('FractionPurchased');
      expect(EventTopics.LOAN_OPENED).toBe('LoanOpened');
      expect(EventTopics.ATTESTATION_CREATED).toBe('AttestationCreated');
    });
  });

  describe('isEventTopic', () => {
    it('should return true for valid event topic', () => {
      expect(isEventTopic('PropertyRegistered')).toBe(true);
      expect(isEventTopic('FractionPurchased')).toBe(true);
    });

    it('should return false for invalid topic', () => {
      expect(isEventTopic('InvalidTopic')).toBe(false);
      expect(isEventTopic('')).toBe(false);
    });
  });
});
