import { getDevices } from "../smartthings.js";

export async function devices(request, env) {
  const result = await getDevices(env);

  if (!result.ok) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "SMARTTHINGS_ERROR",
          message: "SmartThings API request failed",
          status: result.status,
          details: result.data
        }
      },
      { status: result.status }
    );
  }

  return Response.json({
    success: true,
    data: result.data,
    error: null
  });
}