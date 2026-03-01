/**
 * Collaboration types for human-AI co-editing workflows.
 *
 * These types model shared artifacts, ownership sections, AI suggestions,
 * and the review/approval lifecycle that enables structured collaboration
 * between human and AI participants.
 */

/** Who currently owns a section of a shared artifact. */
export type SectionOwnership = 'human' | 'ai' | 'shared';

/** Review status of an artifact section. */
export type SectionStatus = 'draft' | 'in_review' | 'approved' | 'disputed' | 'locked';

/** Collaboration mode describing how human and AI interact. */
export type CollabMode = 'co-edit' | 'review' | 'delegate' | 'observe';

/** Type of participant in a collaboration session. */
export type ParticipantType = 'human' | 'ai';

/**
 * A participant in a collaboration session.
 */
export interface Participant {
  /** Unique identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Whether this is a human or AI participant. */
  type: ParticipantType;
  /** Role in the collaboration (e.g. "analyst", "reviewer"). */
  role?: string;
}

/** Type of edit operation in a suggestion. */
export type SuggestionType = 'replacement' | 'insertion' | 'deletion' | 'comment';

/**
 * An AI-generated suggestion for modifying part of an artifact.
 */
export interface AISuggestion {
  /** Unique identifier for this suggestion. */
  id: string;
  /** Type of change proposed. */
  type: SuggestionType;
  /** The suggested content (empty string for pure deletions). */
  content: string;
  /** Position range in the section content this suggestion applies to. */
  position: { start: number; end: number };
  /** Human-readable explanation of why this change is proposed. */
  rationale: string;
  /** Confidence score in [0, 1] for this suggestion. */
  confidence: number;
  /** Current status of the suggestion. */
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
}

/**
 * A section of a shared artifact with ownership and review tracking.
 */
export interface ArtifactSection {
  /** Unique identifier for this section. */
  id: string;
  /** The text content of this section. */
  content: string;
  /** Who owns this section. */
  owner: SectionOwnership;
  /** Current review status. */
  status: SectionStatus;
  /** AI suggestions attached to this section. */
  suggestions: AISuggestion[];
  /** ID of the participant who last edited this section. */
  lastEditedBy: string;
  /** Timestamp of the last edit. */
  lastEditedAt: Date;
}

/**
 * A shared artifact that human and AI participants collaborate on.
 */
export interface SharedArtifact {
  /** Unique identifier. */
  id: string;
  /** Display title. */
  title: string;
  /** Type of artifact. */
  type: 'document' | 'analysis' | 'report' | 'checklist';
  /** Ordered sections of the artifact. */
  sections: ArtifactSection[];
  /** Collaboration mode. */
  mode: CollabMode;
  /** Participants in this collaboration. */
  participants: Participant[];
  /** Full event history. */
  history: import('../protocol/events.js').CollabEvent[];
  /** When the artifact was created. */
  createdAt: Date;
  /** When the artifact was last updated. */
  updatedAt: Date;
}
