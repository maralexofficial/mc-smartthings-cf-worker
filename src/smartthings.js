const API_URL = "https://api.smartthings.com/v1";

async function request(path, env, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${env.ST_ACCESS_TOKEN}`,
      "Accept": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

export async function getDevices(env) {
  return request("/devices?includeStatus=true", env);
}

export async function getDeviceStatus(deviceId, env) {
  return request(`/devices/${deviceId}/status`, env);
}

export async function sendCommand(deviceId, commands, env) {
  return request(`/devices/${deviceId}/commands`, env, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(commands)
  });
}