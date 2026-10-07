export async function authenticate(request, env) {
  const auth = request.headers.get("Authorization");

  if (!auth) {
    return {
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization header missing"
      }
    };
  }

  if (auth !== `Bearer ${env.MACRO_SECRET}`) {
    return {
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid authentication"
      }
    };
  }

  return {
    success: true,
    data: null,
    error: null
  };
}