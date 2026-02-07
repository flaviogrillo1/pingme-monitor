import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';

export async function withAuth(handler: (request: NextRequest, userId: string) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      return await handler(request, user.id);
    } catch (error) {
      console.error('Auth error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}
