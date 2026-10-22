const { Core } = require('@adobe/aio-sdk');
const { successResponse, errorResponse } = require('../../utils');
const { logStructured } = require('../../logging');

const ACTION = 'product-enrichment';
const IMS_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';
const DEFAULT_SCOPES =
    'openid,AdobeID,email,profile,additional_info.roles,additional_info.projectedProductContext,commerce.accs';

/**
 * Adobe I/O often stores IMS_OAUTH_S2S_SCOPES in .env as a JSON array string. IMS expects a
 * space-delimited scope parameter (RFC 6749). Also normalizes comma-separated lists.
 */

function normalizeScopeTokens (scopeStr) {
    return String(scopeStr)
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .join(' ');
}

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
    if (cachedToken && Date.now() < cachedExpiryMs - 60_000) {
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

async function main (params) {
    const startTime = Date.now();
    const correlationId =
        params['x-correlation-id'] || require('crypto').randomUUID();
    const logger = Core.Logger(ACTION, {
        level: params.LOG_LEVEL || 'info',
    });

    logStructured(logger, 'info', ACTION, 'Action invoked', {
        correlationId,
        sku: params.sku,
    });

    try {
        const { sku } = params;
        if (!sku) {
            logStructured(logger, 'warn', ACTION, 'Missing required parameter: sku', { correlationId });
            return errorResponse(400, 'Missing required parameter: sku', correlationId);
        }

        logStructured(logger, 'info', ACTION, 'Fetching product data', { correlationId, sku });

        const baseUrl = params.COMMERCE_API_BASE_URL.replace(/\/$/, '');
        const accessToken = await getImsAccessToken(params);

        const productUrl = `${baseUrl}/V1/products/${encodeURIComponent(sku)}`;

        const response = await fetch(productUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'x-api-key': params.IMS_OAUTH_S2S_CLIENT_ID,
                'x-gw-ims-org-id': params.IMS_OAUTH_S2S_ORG_ID,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            logStructured(logger, 'error', ACTION, 'Commerce API request failed', {
                correlationId,
                sku,
                status: response.status,
                durationMs: Date.now() - startTime,
            });
            return errorResponse(
                response.status,
                `Commerce API error: ${response.statusText}`,
                correlationId
            );
        }

        const product = await response.json();

        const enrichedProduct = {
            sku: product.sku,
            name: product.name,
            price: product.price,
            sustainabilityScore: Math.floor(Math.random() * 40) + 60,
            estimatedDelivery: '3-5 business days',
            enrichedAt: new Date().toISOString(),
        };

        logStructured(logger, 'info', ACTION, 'Action completed', {
            correlationId,
            sku,
            durationMs: Date.now() - startTime,
        });

        return successResponse(enrichedProduct, correlationId);
    } catch (error) {
        logStructured(logger, 'error', ACTION, 'Action failed', {
            correlationId,
            sku: params.sku,
            error: error.message,
            durationMs: Date.now() - startTime,
        });
        return errorResponse(500, 'Internal server error', correlationId);
    }
}
exports.main = main;
