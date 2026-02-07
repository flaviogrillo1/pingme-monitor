'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function NewMonitorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    check_interval_minutes: 360,
    conditions: [
      {
        type: 'TEXT_MATCH',
        config: {
          text_to_match: '',
          match_mode: 'contains',
          trigger_on: 'appears',
        },
      },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to create monitor');
        return;
      }

      router.push('/app');
    } catch (error) {
      console.error('Failed to create monitor:', error);
      alert('Failed to create monitor');
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        {
          type: 'TEXT_MATCH',
          config: {
            text_to_match: '',
            match_mode: 'contains',
            trigger_on: 'appears',
          },
        },
      ],
    });
  };

  const updateCondition = (index: number, updates: unknown) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setFormData({ ...formData, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    if (formData.conditions.length <= 1) {
      alert('You must have at least one condition');
      return;
    }
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
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
                ← Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Monitor</h1>
          <p className="text-gray-600">Set up a new URL monitor</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Application Status"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL to Monitor
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Interval (minutes)
                </label>
                <Input
                  type="number"
                  min="30"
                  step="30"
                  value={formData.check_interval_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      check_interval_minutes: parseInt(e.target.value) || 360,
                    })
                  }
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Free plan: minimum 360 minutes (6 hours). Pro: minimum 30 minutes.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.conditions.map((condition, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium">Condition {index + 1}</h4>
                    {formData.conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        value={condition.type}
                        onChange={(e) =>
                          updateCondition(index, {
                            type: e.target.value,
                            config:
                              e.target.value === 'TEXT_MATCH'
                                ? {
                                    text_to_match: '',
                                    match_mode: 'contains',
                                    trigger_on: 'appears',
                                  }
                                : e.target.value === 'STATUS_CHANGE'
                                ? {
                                    mode: 'match_any',
                                    status_keywords: [],
                                  }
                                : {
                                    css_selector: '',
                                    trigger_on: 'any_change',
                                  },
                          })
                        }
                      >
                        <option value="TEXT_MATCH">Text Appears/Disappears</option>
                        <option value="STATUS_CHANGE">Status Change</option>
                        <option value="SELECTOR_CHANGE">Selector Change (Pro)</option>
                      </select>
                    </div>

                    {condition.type === 'TEXT_MATCH' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Text to Match
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g., Approved"
                            value={condition.config.text_to_match as string}
                            onChange={(e) =>
                              updateCondition(index, {
                                config: {
                                  ...condition.config,
                                  text_to_match: e.target.value,
                                },
                              })
                            }
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Match Mode
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            value={condition.config.match_mode as string}
                            onChange={(e) =>
                              updateCondition(index, {
                                config: {
                                  ...condition.config,
                                  match_mode: e.target.value,
                                },
                              })
                            }
                          >
                            <option value="contains">Contains</option>
                            <option value="exact">Exact Match</option>
                            <option value="regex">Regex (Pro)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trigger On
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            value={condition.config.trigger_on as string}
                            onChange={(e) =>
                              updateCondition(index, {
                                config: {
                                  ...condition.config,
                                  trigger_on: e.target.value,
                                },
                              })
                            }
                          >
                            <option value="appears">Appears</option>
                            <option value="disappears">Disappears</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                      </>
                    )}

                    {condition.type === 'STATUS_CHANGE' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status Selector (optional)
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g., .status, #status"
                            value={condition.config.status_selector as string || ''}
                            onChange={(e) =>
                              updateCondition(index, {
                                config: {
                                  ...condition.config,
                                  status_selector: e.target.value,
                                },
                              })
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            CSS selector. Leave empty for auto-detection.
                          </p>
                        </div>
                      </>
                    )}

                    {condition.type === 'SELECTOR_CHANGE' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CSS Selector
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g., .price, #status"
                          value={condition.config.css_selector as string}
                          onChange={(e) =>
                            updateCondition(index, {
                              config: {
                                ...condition.config,
                                css_selector: e.target.value,
                              },
                            })
                          }
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addCondition}>
                + Add Another Condition
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Link href="/app">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Monitor'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
