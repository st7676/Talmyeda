interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

/**
 * supertest's Response.body is typed `any` (content-dependent). This is the
 * single place that casts it, so call sites get a real type back instead of
 * `any` propagating through every `.body.data.x` access in the test files.
 */
export function responseData<T>(res: { body: unknown }): T {
  return (res.body as ApiSuccessEnvelope<T>).data;
}
