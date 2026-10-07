import { sendCommand } from "../smartthings.js";

export async function command(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "INVALID_JSON",
          message: "Request body is not valid JSON"
        }
      },
      { status: 400 }
    );
  }

  if (!body.deviceId) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "MISSING_DEVICE_ID",
          message: "deviceId is required"
        }
      },
      { status: 400 }
    );
  }

  if (!body.command) {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "MISSING_COMMAND",
          message: "command is required"
        }
      },
      { status: 400 }
    );
  }

  const commands = [
    {
      component: body.component || "main",
      capability: "switch",
      command: body.command
    }
  ];

  const result = await sendCommand(
    body.deviceId,
    commands,
    env
  );

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