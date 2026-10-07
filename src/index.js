import { authenticate } from "./auth.js";
import { devices } from "./routes/devices.js";
import { command } from "./routes/command.js";
import { status } from "./routes/status.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const authResult = await authenticate(request, env);

    if (!authResult.success) {
      return Response.json(authResult);
    }

    if (url.pathname === "/devices" && request.method === "GET") {
      return devices(request, env);
    }

    const statusMatch = url.pathname.match(
      /^\/devices\/([^/]+)\/status$/
    );

    if (statusMatch && request.method === "GET") {
      return status(request, env, statusMatch[1]);
    }

    if (url.pathname === "/command" && request.method === "POST") {
      return command(request, env);
    }

    return Response.json({
      success: false,
      data: null,
      error: {
        code: "NOT_FOUND",
        message: "Route not found"
      }
    }, { status: 404 });
  }
};