function corsHeaders (allowedOrigins = '*') {
    return {
        'Access-Control-Allow-Origin': allowedOrigins,
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-gw-ims-org-id, x-correlation-id',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
}

function errorResponse (statusCode, message, correlationId) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
        body: {
            error: message,
            correlationId,
            timestamp: new Date().toISOString(),
        },
    };
}

function successResponse (body, correlationId) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: {
            ...body,
            correlationId,
            timestamp: new Date().toISOString(),
        },
    };
}

module.exports = { corsHeaders, errorResponse, successResponse };
