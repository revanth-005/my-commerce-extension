const { Core } = require('@adobe/aio-sdk');
const { successResponse, errorResponse } = require('../../utils');
const { logStructured } = require('../../logging');

const ACTION = 'get-order-details';

const IMS_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';

const DEFAULT_SCOPES =
    'openid,AdobeID,email,profile,additional_info.roles,additional_info.projectedProductContext,commerce.accs';

function normalizeScopeTokens(scopeStr) {
    return String(scopeStr)
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .join(' ');
}

function resolveImsScopeParam(raw, defaultScopes) {
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
            // ignore
        }
    }

    return normalizeScopeTokens(s);
}

let cachedToken = null;
let cachedExpiryMs = 0;

async function getImsAccessToken(params) {
    if (cachedToken && Date.now() < cachedExpiryMs - 60000) {
        return cachedToken;
    }

    const body = new URLSearchParams({
        client_id: params.IMS_OAUTH_S2S_CLIENT_ID,
        client_secret: params.IMS_OAUTH_S2S_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: resolveImsScopeParam(
            params.IMS_OAUTH_S2S_SCOPES,
            DEFAULT_SCOPES
        ),
    });

    const res = await fetch(IMS_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });

    if (!res.ok) {
        const text = await res.text();

        throw new Error(
            `IMS token request failed: ${res.status} ${text}`
        );
    }

    const data = await res.json();

    cachedToken = data.access_token;
    cachedExpiryMs = Date.now() + ((data.expires_in || 3600) * 1000);

    return cachedToken;
}

async function main(params) {
    const startTime = Date.now();

    const correlationId =
        params['x-correlation-id'] || require('crypto').randomUUID();

    const logger = Core.Logger(ACTION, {
        level: params.LOG_LEVEL || 'info',
    });

    try {
        const orderId = params.orderId;

        logStructured(logger, 'info', ACTION, 'Action invoked', {
            correlationId,
            orderId,
        });

        if (!orderId) {
            return errorResponse(
                400,
                'orderId is required',
                correlationId
            );
        }

        const baseUrl = params.COMMERCE_API_BASE_URL.replace(/\/$/, '');

        const accessToken = await getImsAccessToken(params);

        const orderUrl =
            `${baseUrl}/V1/orders/${encodeURIComponent(orderId)}`;

        const orderResponse = await fetch(orderUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'x-api-key': params.IMS_OAUTH_S2S_CLIENT_ID,
                'x-gw-ims-org-id': params.IMS_OAUTH_S2S_ORG_ID,
                'Content-Type': 'application/json',
            },
        });

        if (!orderResponse.ok) {
            logStructured(
                logger,
                'error',
                ACTION,
                'Commerce API request failed',
                {
                    correlationId,
                    orderId,
                    status: orderResponse.status,
                    durationMs: Date.now() - startTime,
                }
            );

            return errorResponse(
                orderResponse.status === 404 ? 404 : 502,
                `Failed to fetch order ${orderId}`,
                correlationId
            );
        }

        const order = await orderResponse.json();

        logStructured(
            logger,
            'info',
            ACTION,
            'Order retrieved successfully',
            {
                correlationId,
                orderId,
                durationMs: Date.now() - startTime,
            }
        );

        return successResponse(
            {
                orderId: order.entity_id,
                incrementId: order.increment_id,
                status: order.status,
                customerEmail: order.customer_email,
                grandTotal: order.grand_total,
                currency: order.order_currency_code,
                itemCount: order.items?.length || 0,
            },
            correlationId
        );
    } catch (error) {
        logStructured(
            logger,
            'error',
            ACTION,
            'Action failed',
            {
                correlationId,
                error: error.message,
                stack: error.stack,
                durationMs: Date.now() - startTime,
            }
        );

        return errorResponse(
            500,
            'Internal server error',
            correlationId
        );
    }
}

exports.main = main;
