/**
 * Collaboration session manager.
 *
 * {@link CollabSession} is the main entry point for creating and
 * manipulating a {@link SharedArtifact}. It maintains the artifact state,
 * enforces lifecycle rules, and emits {@link CollabEvent}s for every
 * mutation.
 */

import type {
  AISuggestion,
  ArtifactSection,
  CollabMode,
  Participant,
  SectionOwnership,
  SharedArtifact,
} from './types.js';
import type { CollabEvent } from '../protocol/events.js';
import { createEvent } from '../protocol/events.js';

/** Configuration required to start a new collaboration session. */
export interface CollabSessionConfig {
  title: string;
  type: SharedArtifact['type'];
  mode: CollabMode;
  participants: Participant[];
}

/**
 * Manages the lifecycle of a shared artifact in a human-AI collaboration.
 *
 * Every mutation records a {@link CollabEvent} in the artifact's history,
 * providing a full audit trail. Methods that modify sections enforce
 * status-based guards (e.g. locked sections cannot be edited).
 */
export class CollabSession {
  /** The shared artifact managed by this session. */
  readonly artifact: SharedArtifact;

  constructor(config: CollabSessionConfig) {
    const now = new Date();
    this.artifact = {
      id: crypto.randomUUID(),
      title: config.title,
      type: config.type,
      sections: [],
      mode: config.mode,
      participants: [...config.participants],
      history: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  // -----------------------------------------------------------------------
  // Section management
  // -----------------------------------------------------------------------

  /**
   * Add a new section to the artifact.
   *
   * @param content - Initial text content.
   * @param owner - Who owns this section.
   * @returns The newly created section.
   */
  addSection(content: string, owner: SectionOwnership): ArtifactSection {
    const section: ArtifactSection = {
      id: crypto.randomUUID(),
      content,
      owner,
      status: 'draft',
      suggestions: [],
      lastEditedBy: owner === 'ai' ? this.findAiParticipantId() : this.findHumanParticipantId(),
      lastEditedAt: new Date(),
    };

    this.artifact.sections.push(section);
    this.touch();

    const event = createEvent('section_created', section.lastEditedBy, {
      sectionId: section.id,
      owner,
      content,
    });
    this.artifact.history.push(event);

    return section;
  }

  /**
   * Update the content of an existing section.
   *
   * @throws If the section is locked.
   */
  updateSection(sectionId: string, content: string, editedBy: string): void {
    const section = this.getSection(sectionId);

    if (section.status === 'locked') {
      throw new Error(`Section "${sectionId}" is locked and cannot be edited.`);
    }

    const previousContent = section.content;
    section.content = content;
    section.lastEditedBy = editedBy;
    section.lastEditedAt = new Date();
    // If the section was approved or disputed, revert to draft on edit.
    if (section.status === 'approved' || section.status === 'disputed') {
      section.status = 'draft';
    }
    this.touch();

    const event = createEvent('section_updated', editedBy, {
      sectionId,
      previousContent,
      newContent: content,
    });
    this.artifact.history.push(event);
  }

  // -----------------------------------------------------------------------
  // Suggestion workflow
  // -----------------------------------------------------------------------

  /**
   * Attach an AI suggestion to a section.
   *
   * The suggestion is created with status `pending`.
   *
   * @returns The fully-formed suggestion with generated id and status.
   */
  addSuggestion(
    sectionId: string,
    suggestion: Omit<AISuggestion, 'id' | 'status'>,
  ): AISuggestion {
    const section = this.getSection(sectionId);

    const fullSuggestion: AISuggestion = {
      ...suggestion,
      id: crypto.randomUUID(),
      status: 'pending',
    };

    section.suggestions.push(fullSuggestion);
    section.status = 'in_review';
    this.touch();

    const participantId = this.findAiParticipantId();
    const event = createEvent('suggestion_added', participantId, {
      sectionId,
      suggestion: fullSuggestion,
    });
    this.artifact.history.push(event);

    return fullSuggestion;
  }

  /**
   * Accept a pending suggestion, applying its content change to the
   * section.
   */
  acceptSuggestion(sectionId: string, suggestionId: string): void {
    const section = this.getSection(sectionId);
    const suggestion = this.getSuggestion(section, suggestionId);

    if (suggestion.status !== 'pending') {
      throw new Error(
        `Suggestion "${suggestionId}" is "${suggestion.status}", not "pending".`,
      );
    }

    suggestion.status = 'accepted';
    this.applySuggestion(section, suggestion);
    this.touch();

    const event = createEvent(
      'suggestion_accepted',
      section.lastEditedBy,
      { sectionId, suggestionId },
    );
    this.artifact.history.push(event);
  }

  /** Reject a pending suggestion without modifying the section content. */
  rejectSuggestion(sectionId: string, suggestionId: string): void {
    const section = this.getSection(sectionId);
    const suggestion = this.getSuggestion(section, suggestionId);

    if (suggestion.status !== 'pending') {
      throw new Error(
        `Suggestion "${suggestionId}" is "${suggestion.status}", not "pending".`,
      );
    }

    suggestion.status = 'rejected';
    this.touch();

    const event = createEvent(
      'suggestion_rejected',
      section.lastEditedBy,
      { sectionId, suggestionId },
    );
    this.artifact.history.push(event);
  }

  // -----------------------------------------------------------------------
  // Handoff & review
  // -----------------------------------------------------------------------

  /**
   * Request a handoff of responsibility from one participant to another.
   *
   * @returns The generated handoff event.
   */
  requestHandoff(
    fromId: string,
    toId: string,
    message: string,
  ): CollabEvent {
    this.getParticipant(fromId);
    this.getParticipant(toId);

    const event = createEvent('handoff_requested', fromId, {
      fromId,
      toId,
      message,
    });
    this.artifact.history.push(event);
    this.touch();

    return event;
  }

  /** Mark a section as approved by a specific participant. */
  approveSection(sectionId: string, approvedBy: string): void {
    const section = this.getSection(sectionId);
    section.status = 'approved';
    this.touch();

    const event = createEvent('section_approved', approvedBy, {
      sectionId,
      approvedBy,
    });
    this.artifact.history.push(event);
  }

  /** Mark a section as disputed with a reason. */
  disputeSection(
    sectionId: string,
    disputedBy: string,
    reason: string,
  ): void {
    const section = this.getSection(sectionId);
    section.status = 'disputed';
    this.touch();

    const event = createEvent('section_disputed', disputedBy, {
      sectionId,
      disputedBy,
      reason,
    });
    this.artifact.history.push(event);
  }

  // -----------------------------------------------------------------------
  // Query helpers
  // -----------------------------------------------------------------------

  /** Return a shallow copy of the full event history. */
  getHistory(): CollabEvent[] {
    return [...this.artifact.history];
  }

  /** Serialize the artifact to a plain JSON-safe object. */
  toJSON(): SharedArtifact {
    return structuredClone(this.artifact);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private getSection(sectionId: string): ArtifactSection {
    const section = this.artifact.sections.find((s) => s.id === sectionId);
    if (!section) {
      throw new Error(`Section "${sectionId}" not found.`);
    }
    return section;
  }

  private getSuggestion(
    section: ArtifactSection,
    suggestionId: string,
  ): AISuggestion {
    const suggestion = section.suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) {
      throw new Error(
        `Suggestion "${suggestionId}" not found in section "${section.id}".`,
      );
    }
    return suggestion;
  }

  private getParticipant(participantId: string): Participant {
    const participant = this.artifact.participants.find(
      (p) => p.id === participantId,
    );
    if (!participant) {
      throw new Error(`Participant "${participantId}" not found.`);
    }
    return participant;
  }

  /**
   * Apply a suggestion's content change to a section.
   */
  private applySuggestion(
    section: ArtifactSection,
    suggestion: AISuggestion,
  ): void {
    const { start, end } = suggestion.position;
    const before = section.content.slice(0, start);
    const after = section.content.slice(end);

    switch (suggestion.type) {
      case 'replacement':
        section.content = before + suggestion.content + after;
        break;
      case 'insertion':
        section.content = before + suggestion.content + section.content.slice(start);
        break;
      case 'deletion':
        section.content = before + after;
        break;
      case 'comment':
        // Comments do not modify content.
        break;
    }
  }

  /** Update the artifact's `updatedAt` timestamp. */
  private touch(): void {
    this.artifact.updatedAt = new Date();
  }

  /** Find the first AI participant id, or fall back to 'ai'. */
  private findAiParticipantId(): string {
    const ai = this.artifact.participants.find((p) => p.type === 'ai');
    return ai?.id ?? 'ai';
  }

  /** Find the first human participant id, or fall back to 'human'. */
  private findHumanParticipantId(): string {
    const human = this.artifact.participants.find((p) => p.type === 'human');
    return human?.id ?? 'human';
  }
}
