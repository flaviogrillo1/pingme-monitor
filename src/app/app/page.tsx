'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Monitor {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  check_interval_minutes: number;
  last_check_at: string | null;
  last_status: string | null;
  plan_snapshot: string;
}

interface Condition {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Array<Monitor & { conditions: Condition[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<'FREE' | 'PRO'>('FREE');

  useEffect(() => {
    fetchMonitors();
  }, []);

  const fetchMonitors = async () => {
    try {
      const res = await fetch('/api/monitors');
      const data = await res.json();
      setMonitors(data.monitors || []);
      
      // Get plan from first monitor or default to FREE
      if (data.monitors?.length > 0) {
        setUserPlan(data.monitors[0].plan_snapshot || 'FREE');
      }
    } catch (error) {
      console.error('Failed to fetch monitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="default">Unknown</Badge>;
    
    switch (status) {
      case 'OK':
        return <Badge variant="success">✓ OK</Badge>;
      case 'TRIGGERED':
        return <Badge variant="warning">⚠️ Triggered</Badge>;
      case 'ERROR':
        return <Badge variant="error">✕ Error</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatInterval = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatLastCheck = (date: string | null) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🔔</span>
              <span className="font-bold text-xl">PingMe</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Badge variant={userPlan === 'PRO' ? 'success' : 'default'}>
                {userPlan}
              </Badge>
              <Button variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Monitors</h1>
            <p className="text-gray-600">Manage your URL monitors</p>
          </div>
          <Link href="/app/new">
            <Button>+ Create Monitor</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading monitors...</div>
          </div>
        ) : monitors.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-lg font-semibold mb-2">No monitors yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first monitor to get started
              </p>
              <Link href="/app/new">
                <Button>Create Monitor</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interval
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Check
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monitors.map((monitor) => (
                  <tr key={monitor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{monitor.name}</div>
                      <div className="text-sm text-gray-500">
                        {monitor.conditions.length} condition{monitor.conditions.length > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 truncate max-w-xs">
                        {monitor.url}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatInterval(monitor.check_interval_minutes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastCheck(monitor.last_check_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(monitor.last_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/app/monitors/${monitor.id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        View
                      </Link>
                      <button className="text-gray-400 hover:text-gray-600">
                        ⋮
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Plan Limits Banner */}
        {userPlan === 'FREE' && monitors.length >= 2 && (
          <Card className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-indigo-900">Free Plan Limit Reached</h3>
                  <p className="text-sm text-indigo-700">
                    Upgrade to Pro for up to 20 monitors and 30-minute intervals
                  </p>
                </div>
                <Button>Upgrade to Pro</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
