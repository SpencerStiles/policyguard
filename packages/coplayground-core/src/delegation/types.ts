/**
 * Task delegation types for human-AI work splitting.
 *
 * These types model how work is divided between human and AI participants,
 * including task assignment, dependency tracking, effort estimation, and
 * handoff coordination.
 */

/** Priority level for a delegated task. */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/** Who is responsible for completing a task. */
export type TaskAssignee = 'human' | 'ai' | 'collaborative';

/**
 * A single task that has been delegated to a human, AI, or shared
 * between both.
 */
export interface DelegatedTask {
  /** Unique identifier for this task. */
  id: string;
  /** Short human-readable title. */
  title: string;
  /** Detailed description of what needs to be done. */
  description: string;
  /** Who is responsible for this task. */
  assignee: TaskAssignee;
  /** Priority level. */
  priority: TaskPriority;
  /** Current execution status. */
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked';
  /** IDs of tasks that must be completed before this one can start. */
  dependencies: string[];
  /** Estimated effort as a human-readable string (e.g. "2 hours", "3 story points"). */
  estimatedEffort: string;
  /** Actual effort after completion, same format as estimatedEffort. */
  actualEffort?: string;
  /** The output or deliverable produced by this task. */
  result?: string;
  /** Notes from the reviewer after the task enters review. */
  reviewNotes?: string;
}

/**
 * A high-level view of how work is split across a set of tasks,
 * with aggregate counters and overall progress.
 */
export interface WorkSplit {
  /** Unique identifier for this work split. */
  id: string;
  /** Title or name of the overall work package. */
  title: string;
  /** All tasks in this work split. */
  tasks: DelegatedTask[];
  /** Number of tasks assigned to humans. */
  humanTasks: number;
  /** Number of tasks assigned to AI. */
  aiTasks: number;
  /** Number of tasks assigned collaboratively. */
  collabTasks: number;
  /** Overall progress as a ratio (0-1). */
  progress: number;
}

/**
 * A request to hand off responsibility for a task from one
 * participant to another.
 */
export interface HandoffRequest {
  /** Participant ID of the current owner. */
  from: string;
  /** Participant ID of the intended new owner. */
  to: string;
  /** ID of the task being handed off. */
  taskId: string;
  /** Message explaining why the handoff is happening. */
  message: string;
  /** Additional context to help the recipient pick up the work. */
  context: string;
  /** How urgently the recipient should pick this up. */
  urgency: 'immediate' | 'when_ready' | 'low';
}
