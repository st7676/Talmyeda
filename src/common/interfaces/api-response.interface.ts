/** Consistent API envelopes. Spec section 65. */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/** Standard paginated payload. Spec section 86, 98.1. */
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
