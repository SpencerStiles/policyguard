/**
 * Collaboration protocol events.
 *
 * All state changes in a collaboration session are represented as immutable
 * events. This module defines a discriminated union of all event types, a
 * factory helper for creating events, and utilities for filtering event
 * streams.
 */

import type { ConfidenceSignal } from '../confidence/types.js';
import type {
  AISuggestion,
  SectionOwnership,
} from '../collaboration/types.js';

// ---------------------------------------------------------------------------
// Individual event payload interfaces
// ---------------------------------------------------------------------------

interface BaseEvent {
  /** Unique identifier for this event. */
  id: string;
  /** When the event occurred. */
  timestamp: Date;
  /** Participant who triggered the event. */
  participantId: string;
}

export interface SectionCreatedEvent extends BaseEvent {
  type: 'section_created';
  data: {
    sectionId: string;
    owner: SectionOwnership;
    content: string;
  };
}

export interface SectionUpdatedEvent extends BaseEvent {
  type: 'section_updated';
  data: {
    sectionId: string;
    previousContent: string;
    newContent: string;
  };
}

export interface SuggestionAddedEvent extends BaseEvent {
  type: 'suggestion_added';
  data: {
    sectionId: string;
    suggestion: AISuggestion;
  };
}

export interface SuggestionAcceptedEvent extends BaseEvent {
  type: 'suggestion_accepted';
  data: {
    sectionId: string;
    suggestionId: string;
  };
}

export interface SuggestionRejectedEvent extends BaseEvent {
  type: 'suggestion_rejected';
  data: {
    sectionId: string;
    suggestionId: string;
  };
}

export interface HandoffRequestedEvent extends BaseEvent {
  type: 'handoff_requested';
  data: {
    fromId: string;
    toId: string;
    message: string;
  };
}

export interface HandoffAcceptedEvent extends BaseEvent {
  type: 'handoff_accepted';
  data: {
    fromId: string;
    toId: string;
  };
}

export interface SectionApprovedEvent extends BaseEvent {
  type: 'section_approved';
  data: {
    sectionId: string;
    approvedBy: string;
  };
}

export interface SectionDisputedEvent extends BaseEvent {
  type: 'section_disputed';
  data: {
    sectionId: string;
    disputedBy: string;
    reason: string;
  };
}

export interface TaskAssignedEvent extends BaseEvent {
  type: 'task_assigned';
  data: {
    taskId: string;
    assignee: string;
  };
}

export interface TaskCompletedEvent extends BaseEvent {
  type: 'task_completed';
  data: {
    taskId: string;
    result: string;
  };
}

export interface ConfidenceUpdatedEvent extends BaseEvent {
  type: 'confidence_updated';
  data: {
    sectionId: string;
    previousConfidence: ConfidenceSignal;
    newConfidence: ConfidenceSignal;
  };
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

/** Union of all collaboration events, discriminated on `type`. */
export type CollabEvent =
  | SectionCreatedEvent
  | SectionUpdatedEvent
  | SuggestionAddedEvent
  | SuggestionAcceptedEvent
  | SuggestionRejectedEvent
  | HandoffRequestedEvent
  | HandoffAcceptedEvent
  | SectionApprovedEvent
  | SectionDisputedEvent
  | TaskAssignedEvent
  | TaskCompletedEvent
  | ConfidenceUpdatedEvent;

/** The set of possible event type discriminators. */
export type CollabEventType = CollabEvent['type'];

// ---------------------------------------------------------------------------
// Event factory
// ---------------------------------------------------------------------------

/**
 * Helper that creates a new event with an auto-generated id and timestamp.
 *
 * The caller supplies the `type`, `participantId`, and type-specific `data`.
 * Everything else is filled in automatically.
 *
 * @example
 * ```ts
 * const evt = createEvent('section_created', 'user-1', {
 *   sectionId: 's1',
 *   owner: 'human',
 *   content: 'Hello',
 * });
 * ```
 */
export function createEvent<T extends CollabEvent['type']>(
  type: T,
  participantId: string,
  data: Extract<CollabEvent, { type: T }>['data'],
): Extract<CollabEvent, { type: T }> {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    type,
    participantId,
    data,
  } as Extract<CollabEvent, { type: T }>;
}

// ---------------------------------------------------------------------------
// Filtering utilities
// ---------------------------------------------------------------------------

/**
 * Criteria for filtering a stream of collaboration events.
 *
 * All fields are optional. When multiple fields are provided they are
 * combined with AND semantics.
 */
export interface EventFilter {
  /** Include only events of these types. */
  types?: CollabEventType[];
  /** Include only events from this participant. */
  participantId?: string;
  /** Include only events at or after this timestamp. */
  after?: Date;
  /** Include only events at or before this timestamp. */
  before?: Date;
}

/**
 * Filter an array of collaboration events using the supplied criteria.
 *
 * Returns a new array; the input is never mutated.
 */
export function filterEvents(
  events: readonly CollabEvent[],
  filter: EventFilter,
): CollabEvent[] {
  return events.filter((event) => {
    if (filter.types && filter.types.length > 0) {
      if (!filter.types.includes(event.type)) {
        return false;
      }
    }

    if (filter.participantId !== undefined) {
      if (event.participantId !== filter.participantId) {
        return false;
      }
    }

    if (filter.after !== undefined) {
      if (event.timestamp.getTime() < filter.after.getTime()) {
        return false;
      }
    }

    if (filter.before !== undefined) {
      if (event.timestamp.getTime() > filter.before.getTime()) {
        return false;
      }
    }

    return true;
  });
}
