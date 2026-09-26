/** Error body returned by every endpoint, e.g. { "error": "BOOKING_NOT_FOUND", "message": "..." }. */
export interface ErrorResponse {
  error: string;
  message: string;
}
