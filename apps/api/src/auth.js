// Provider selection and setup are pending owner approval. Fail closed:
// callers cannot treat an unverified browser-supplied ID as an identity.
export async function requireVerifiedSession() {
  throw new Error('Authentication is not configured');
}
