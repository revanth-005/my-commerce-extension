// Web actions in the Stage workspace. Update this if the workspace changes.
const ACTIONS_BASE_URL =
  "https://3967933-802pinklion-stage.adobeioruntime.net/api/v1/web/course-labs";

/** Calls a protected web action with the Admin user's IMS credentials. */
export async function callAction(name, ims, body) {
  const response = await fetch(`${ACTIONS_BASE_URL}/${name}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${ims.imsToken}`,
      "x-gw-ims-org-id": ims.imsOrgId,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}
