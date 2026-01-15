import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/30 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-600/30 rounded-full blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/20 rounded-full blur-[150px]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          SignalForge
        </div>
        <Link
          href="/login"
          className="px-5 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/10 transition-all duration-300"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 text-center">
        {/* Badge */}
        <div className="mb-6 px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-full backdrop-blur-sm">
          ✨ 3 free runs per month • No credit card required
        </div>

        {/* Main headline */}
        <h1 className="max-w-4xl text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
          Stop guessing{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            what to post.
          </span>
          <br />
          Start betting on{' '}
          <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            ideas that win.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-gray-400 leading-relaxed">
          SignalForge scans Reddit, X, and LinkedIn to find viral content in your niche.
          Get explainable virality scores and narrative clusters to fuel your next post.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="group px-8 py-4 text-lg font-semibold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-full transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
          >
            Get Early Access
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 text-lg font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300"
          >
            See How It Works
          </a>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            APIs + Scraping Fallback
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            Explainable Scores
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Built for Creators
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How SignalForge Works
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            From theme to insights in under 60 seconds
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-purple-500/50 transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl text-xl font-bold mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Enter Your Theme</h3>
              <p className="text-gray-400">
                Tell us what you want to post about. &quot;AI tools for PMs&quot;, &quot;Startup mistakes&quot;, or anything in your niche.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-cyan-600 to-pink-600 rounded-xl text-xl font-bold mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">We Scan Everything</h3>
              <p className="text-gray-400">
                Our pipeline searches Reddit, X, and LinkedIn for viral content. APIs first, scraping fallback always.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-pink-500/50 transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl text-xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Get Ranked Ideas</h3>
              <p className="text-gray-400">
                Receive narrative clusters with virality scores (0-100) and clear explanations of why each post performs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Virality Score Section */}
      <section className="relative z-10 py-24 px-6 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Explainable Virality Scores
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
            No black-box AI. Every score comes with clear reasons.
          </p>

          {/* Score example card */}
          <div className="max-w-lg mx-auto p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-left">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs text-purple-400 font-medium mb-1">REDDIT • r/startups</div>
                <h4 className="font-semibold">&quot;The biggest mistake I made raising my seed round&quot;</h4>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                  87
                </div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                High Reddit engagement: 1.2K+ interactions
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                Posted in last 24 hours - high relevance
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                Story-driven format performs well
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to find your next viral idea?
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            3 free discovery runs per month. No credit card required.
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-5 text-xl font-semibold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-full transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
          >
            Start Discovering →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>© 2025 SignalForge. Built for creators who ship.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
