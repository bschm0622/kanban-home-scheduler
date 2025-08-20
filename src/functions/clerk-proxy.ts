import type { Handler } from '@netlify/functions';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;
const CLERK_PROXY_URL = process.env.NEXT_PUBLIC_CLERK_PROXY_URL!;

export const handler: Handler = async (event) => {
    try {
        // Remove /clerk prefix
        const path = event.path.replace(/^\/clerk/, '');
        const url = `https://frontend-api.clerk.dev${path}${event.rawQuery || ''}`;

        // Forward all original headers
        const headers: Record<string, string> = {
            ...event.headers,
            'Clerk-Secret-Key': CLERK_SECRET_KEY,
            'Clerk-Proxy-Url': CLERK_PROXY_URL,
            'X-Forwarded-For': event.headers['client-ip'] || event.headers['x-forwarded-for'] || '',
        };

        // Forward the request to Clerk Frontend API
        const resp = await fetch(url, {
            method: event.httpMethod,
            headers,
            body: event.body,
        });

        // Clone content-type header
        const contentType = resp.headers.get('content-type') || 'application/json';

        const body = await resp.text();

        return {
            statusCode: resp.status,
            headers: { 'Content-Type': contentType },
            body,
        };
    } catch (err: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
