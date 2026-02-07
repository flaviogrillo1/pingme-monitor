import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

export interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now();
  const windowMs = config.window * 1000;

  // Clean up expired entries
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key);
    }
  }

  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    // First request or window expired
    const newRecord: RateLimitStore = {
      count: 1,
      resetTime: now + windowMs,
    };
    store.set(identifier, newRecord);

    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: newRecord.resetTime,
    };
  }

  if (record.count >= config.requests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  store.set(identifier, record);

  return {
    success: true,
    limit: config.requests,
    remaining: config.requests - record.count,
    reset: record.resetTime,
  };
}

export function getIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header or fall back to IP
  const authHeader = request.headers.get('authorization');
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  return authHeader ? `${authHeader}:${ip}` : ip;
}

export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const identifier = getIdentifier(request);
  const result = await rateLimit(identifier, config);

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        limit: result.limit,
        reset: new Date(result.reset).toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.reset).toISOString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}
