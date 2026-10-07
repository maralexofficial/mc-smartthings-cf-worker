import { getDeviceStatus } from "../smartthings.js";

export async function status(request, env, deviceId) {
  const result = await getDeviceStatus(deviceId, env);

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