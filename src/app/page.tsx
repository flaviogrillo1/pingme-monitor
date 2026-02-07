import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔔</span>
              <span className="font-bold text-xl text-gray-900">PingMe</span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/app">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/app">
                <Button>Start Free</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Stop refreshing pages.
            <br />
            We'll ping you when it changes.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Monitor any URL for status changes, text appearances, or updates. Get instant email alerts when something happens.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/app">
              <Button size="lg" className="text-lg">
                Start Free →
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-4">🔄</div>
            <h3 className="text-lg font-semibold mb-2">Status Monitoring</h3>
            <p className="text-gray-600">
              Track status changes like PENDING → APPROVED. Perfect for application tracking.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Text Detection</h3>
            <p className="text-gray-600">
              Get notified when specific text appears or disappears from any page.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Instant Alerts</h3>
            <p className="text-gray-600">
              Email notifications delivered instantly when changes are detected.
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-8">Simple Pricing</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-gray-600 mb-4">Perfect for getting started</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  2 monitors
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  6-hour check interval
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Email alerts
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  1 condition per monitor
                </li>
              </ul>
              <Link href="/app">
                <Button className="w-full">Start Free</Button>
              </Link>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-8 text-white shadow-lg">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <p className="text-indigo-100 mb-4">For power users</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  20 monitors
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  30-minute check interval
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  History & analytics
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Regex & selector monitoring
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Custom cooldown
                </li>
              </ul>
              <Link href="/app">
                <Button variant="secondary" className="w-full">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">FAQ</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-2">What data do you store?</h3>
              <p className="text-gray-600">
                We only store limited text excerpts and content hashes for comparison. We never store full page content or sensitive data.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-2">How often do you check?</h3>
              <p className="text-gray-600">
                Free plans check every 6 hours. Pro plans can check as often as every 30 minutes. You can choose your preferred interval.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">
                Yes! You can cancel your Pro subscription anytime from your dashboard. You'll keep Pro features until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">
            © 2025 PingMe. Built with Next.js, Supabase, and Stripe.
          </p>
        </div>
      </footer>
    </div>
  );
}
