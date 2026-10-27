/** Reject hosting error pages before Safari turns response.json() into a vague syntax error. */
export async function validateApiResponse(response: Response): Promise<Response> {
  if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Access to the server is restricted by the hosting provider (HTTP ${response.status}). Sign in to the hosted site and refresh the page.`);
    }
    throw new Error(`The server API returned a non-JSON response (HTTP ${response.status}). Check the hosting routes and Next.js server functions.`);
  }
  let data: unknown;
  try { data = await response.clone().json(); }
  catch { throw new Error(`The server returned invalid JSON (HTTP ${response.status}). Please retry or check the server deployment.`); }
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : `Request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return response;
}
