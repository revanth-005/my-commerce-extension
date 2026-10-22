const IMS_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';
const DEFAULT_SCOPES =
    'openid,AdobeID,email,profile,additional_info.roles,additional_info.projectedProductContext,commerce.accs';

function normalizeScopeTokens (scopeStr) {
    return String(scopeStr)
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .join(' ');
}

// IMS_OAUTH_S2S_SCOPES may arrive as a JSON array string; IMS needs a space-delimited list.
function resolveImsScopeParam (raw, defaultScopes) {
    if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
        return normalizeScopeTokens(defaultScopes);
    }
    if (Array.isArray(raw)) {
        return raw.map((t) => String(t).trim()).filter(Boolean).join(' ');
    }
    const s = String(raw).trim();
    if (s.startsWith('[')) {
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) {
                return parsed.map((t) => String(t).trim()).filter(Boolean).join(' ');
            }
        } catch {
            /* fall through */
        }
    }
    return normalizeScopeTokens(s);
}

let cachedToken = null;
let cachedExpiryMs = 0;

async function getImsAccessToken (params) {
    if (cachedToken && Date.now() < cachedExpiryMs - 60000) {
        return cachedToken;
    }
    const body = new URLSearchParams({
        client_id: params.IMS_OAUTH_S2S_CLIENT_ID,
        client_secret: params.IMS_OAUTH_S2S_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: resolveImsScopeParam(params.IMS_OAUTH_S2S_SCOPES, DEFAULT_SCOPES),
    });
    const res = await fetch(IMS_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`IMS token request failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    cachedToken = data.access_token;
    cachedExpiryMs = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
}

module.exports = { getImsAccessToken };
