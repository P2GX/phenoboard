// Define custom error types
export class WorkflowError extends Error {
  constructor(
    public code: 'NOT_INITIALIZED' | 'VALIDATION_FAILED' | 'MISSING_ACRONYM' | 'MISSING_MOI',
    message: string,
  ) {
    super(message);
  }
}
