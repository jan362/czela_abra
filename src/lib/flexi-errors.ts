/**
 * Error thrown when the Flexi API returns a non-OK HTTP response.
 */
export class FlexiApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly responseBody: string,
    public readonly url: string
  ) {
    super(`Flexi API error ${status} ${statusText} at ${url}`);
    this.name = "FlexiApiError";
  }
}

/**
 * Error thrown when a specific record is not found.
 */
export class FlexiNotFoundError extends Error {
  constructor(
    public readonly evidence: string,
    public readonly id: string | number
  ) {
    super(`Record not found: ${evidence}/${id}`);
    this.name = "FlexiNotFoundError";
  }
}
