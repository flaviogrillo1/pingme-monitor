'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MonitorDetail {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  check_interval_minutes: number;
  last_check_at: string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
  conditions: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
  }>;
  snapshots: Array<{
    id: string;
    observed_at: string;
    content_hash: string | null;
    extracted_status: string | null;
  }>;
  checks: Array<{
    id: string;
    checked_at: string;
    result: string;
    details: Record<string, unknown>;
  }>;
  events: Array<{
    id: string;
    event_at: string;
    type: string;
    reason: string | null;
    payload: Record<string, unknown>;
  }>;
}

export default function MonitorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [monitor, setMonitor] = useState<MonitorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchMonitor();
  }, [params.id]);

  const fetchMonitor = async () => {
    try {
      const res = await fetch(`/api/monitors/${params.id}`);
      if (!res.ok) {
        router.push('/app');
        return;
      }
      const data = await res.json();
      setMonitor(data.monitor);
    } catch (error) {
      console.error('Failed to fetch monitor:', error);
    } finally {
      setLoading(false);
    }
  };

  const testNow = async () => {
    setTesting(true);
    try {
      const res = await fetch(`/api/monitors/${params.id}/test-now`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        alert(data.triggered ? 'Change detected!' : 'No changes detected');
        fetchMonitor();
      } else {
        alert(data.error || 'Test failed');
      }
    } catch (error) {
      console.error('Failed to test monitor:', error);
      alert('Failed to test monitor');
    } finally {
      setTesting(false);
    }
  };

  const togglePause = async () => {
    if (!monitor) return;
    
    try {
      const res = await fetch(`/api/monitors/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !monitor.is_active }),
      });
      if (res.ok) {
        fetchMonitor();
      }
    } catch (error) {
      console.error('Failed to toggle monitor:', error);
    }
  };

  const deleteMonitor = async () => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    
    try {
      const res = await fetch(`/api/monitors/${params.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/app');
      }
    } catch (error) {
      console.error('Failed to delete monitor:', error);
      alert('Failed to delete monitor');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Monitor not found</div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/app" className="flex items-center space-x-2">
              <span className="text-2xl">🔔</span>
              <span className="font-bold text-xl">PingMe</span>
            </Link>
            <Link href="/app">
              <Button variant="outline" size="sm">
                ← Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{monitor.name}</h1>
            <p className="text-gray-600">{monitor.url}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testNow}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Now'}
            </Button>
            <Button
              variant="outline"
              onClick={togglePause}
            >
              {monitor.is_active ? 'Pause' : 'Resume'}
            </Button>
            <Button
              variant="destructive"
              onClick={deleteMonitor}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Current Status</div>
                    <div className="mt-1">{getStatusBadge(monitor.last_status)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Last Check</div>
                    <div className="mt-1 text-sm">
                      {monitor.last_check_at
                        ? new Date(monitor.last_check_at).toLocaleString()
                        : 'Never'}
                    </div>
                  </div>
                </div>
                {monitor.last_error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Error:</strong> {monitor.last_error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monitor.conditions.map((condition, index) => (
                    <div key={condition.id} className="p-3 bg-gray-50 rounded border">
                      <div className="font-medium text-sm">
                        Condition {index + 1}: {condition.type.replace('_', ' ')}
                      </div>
                      <pre className="text-xs mt-2 text-gray-600 overflow-auto">
                        {JSON.stringify(condition.config, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
              </CardHeader>
              <CardContent>
                {monitor.events.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No events yet</div>
                ) : (
                  <div className="space-y-3">
                    {monitor.events.map((event) => (
                      <div key={event.id} className="p-3 bg-gray-50 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="default" className="mb-1">
                              {event.type}
                            </Badge>
                            <div className="text-sm text-gray-600">
                              {event.reason || 'No details'}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(event.event_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check History */}
            <Card>
              <CardHeader>
                <CardTitle>Check History</CardTitle>
              </CardHeader>
              <CardContent>
                {monitor.checks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No checks yet</div>
                ) : (
                  <div className="space-y-2">
                    {monitor.checks.map((check) => (
                      <div key={check.id} className="flex justify-between items-center p-2 border-b">
                        <div>
                          {getStatusBadge(check.result)}
                          {check.details.latency && (
                            <span className="text-xs text-gray-500 ml-2">
                              {check.details.latency}ms
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(check.checked_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Config */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500">Interval</div>
                  <div className="font-medium">
                    {monitor.check_interval_minutes >= 60
                      ? `${Math.floor(monitor.check_interval_minutes / 60)}h`
                      : `${monitor.check_interval_minutes}m`}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Active</div>
                  <div className="font-medium">
                    {monitor.is_active ? 'Yes' : 'No'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Plan</div>
                  <div className="font-medium">{monitor.plan_snapshot}</div>
                </div>
                <div>
                  <div className="text-gray-500">Created</div>
                  <div className="font-medium">
                    {new Date(monitor.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Latest Snapshot */}
            {monitor.snapshots[0] && (
              <Card>
                <CardHeader>
                  <CardTitle>Latest Content</CardTitle>
                </CardHeader>
                <CardContent>
                  {monitor.snapshots[0].extracted_status && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500">Extracted Status</div>
                      <div className="font-medium">
                        {monitor.snapshots[0].extracted_status}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500">Content Preview</div>
                    <div className="text-xs bg-gray-50 p-2 rounded mt-1 max-h-40 overflow-auto">
                      {monitor.snapshots[0].extracted_plain_text_preview?.substring(0, 500)}
                      ...
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(monitor.snapshots[0].observed_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
