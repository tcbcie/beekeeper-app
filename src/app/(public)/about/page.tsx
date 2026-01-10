import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - HiveCraic',
  description: 'About HiveCraic - A comprehensive beekeeping management application',
}

export default function AboutPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1>About HiveCraic</h1>

      <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 mb-6 not-prose">
        <p className="font-semibold text-amber-900 dark:text-amber-300">Comprehensive Beekeeping Management</p>
        <p className="text-amber-800 dark:text-amber-400 mt-2">
          HiveCraic is a modern beekeeping management application designed to help beekeepers
          of all experience levels track and manage their apiaries, hives, queens, and beekeeping activities.
        </p>
      </div>

      <h2>What is HiveCraic?</h2>
      <p>
        HiveCraic is a comprehensive beekeeping management application designed to help beekeepers
        of all experience levels track and manage their apiaries, hives, queens, and beekeeping activities.
        Whether you&apos;re a hobbyist with a few hives or managing a large commercial operation,
        HiveCraic provides the tools you need to stay organized and make informed decisions.
      </p>

      <h2>Features</h2>
      <ul>
        <li><strong>Complete Apiary and Hive Management</strong> - Track all your bee yards and hives in one place</li>
        <li><strong>Apiaries Team Management</strong> - Collaborate with other beekeepers on shared apiaries</li>
        <li><strong>Queen Tracking</strong> - Monitor queen age, lineage, and performance records</li>
        <li><strong>Detailed Inspection Logging</strong> - Record inspections with automatic weather data</li>
        <li><strong>Varroa Mite Monitoring</strong> - Track mite counts and treatment schedules</li>
        <li><strong>Queen Rearing Batch Management</strong> - Manage queen rearing operations with batch tracking</li>
        <li><strong>Harvest and Feeding Records</strong> - Log honey harvests and feeding activities</li>
        <li><strong>Multi-user Support</strong> - Role-based access control for teams</li>
        <li><strong>Email Notifications</strong> - Get reminders for tasks, events, and batch milestones</li>
        <li><strong>Data Export</strong> - Export your data for backup or analysis</li>
        <li><strong>Mobile App (PWA)</strong> - Install on your phone for easy field access</li>
        <li><strong>AI Assistant (Mel)</strong> - Get intelligent help with access to your hive data</li>
        <li><strong>Knowledge Base</strong> - AI-powered answers sourced from beekeeping literature</li>
        <li><strong>Community Map</strong> - View shared apiary locations and connect with nearby beekeepers</li>
        <li><strong>Wild Colony Tracking</strong> - Record and monitor feral bee colonies</li>
        <li><strong>Beekeeping Tools</strong> - Useful calculators and utilities for daily beekeeping tasks</li>
      </ul>

      <h2>Technology</h2>
      <p>
        HiveCraic is built with modern web technologies to ensure a fast, reliable, and secure experience:
      </p>
      <h3>Web Platform</h3>
      <ul>
        <li><strong>Next.js &amp; React</strong> - For a responsive, app-like experience</li>
        <li><strong>TypeScript</strong> - For code reliability and maintainability</li>
        <li><strong>Tailwind CSS</strong> - For a clean, modern interface</li>
        <li><strong>Supabase</strong> - For secure data storage and authentication</li>
        <li><strong>Progressive Web App (PWA)</strong> - Install on any device</li>
      </ul>
      <h3>AI &amp; Machine Learning</h3>
      <ul>
        <li><strong>AI Assistant (Mel)</strong> - Powered by Claude (Anthropic) for intelligent beekeeping advice with access to your hive data</li>
        <li><strong>Knowledge Base RAG</strong> - Retrieval-Augmented Generation pipeline:
          <ul>
            <li>OpenAI text-embedding-3-small for vector embeddings (1536 dimensions)</li>
            <li>Supabase pgvector for semantic similarity search</li>
            <li>GPT-4o Vision &amp; Gemini 2.0 Flash for PDF OCR</li>
            <li>Multi-language support with automatic translation</li>
          </ul>
        </li>
        <li><strong>Varroa Mite Detection</strong> - YOLOv8 computer vision for automated mite counting with FastAPI backend</li>
        <li><strong>Diagnosis Image Analysis</strong> - Collaborative image collection for training future AI-powered disease and pest diagnosis</li>
        <li><strong>Label Studio</strong> - Data annotation pipeline for continuous model improvement</li>
      </ul>

      <h2>Version</h2>
      <p>
        <strong>Current Version:</strong> 1.5.9 (January 2026)
      </p>

      <h2>Credits</h2>
      <p>
        Crafted with honeyed hearts by <strong>tcbc.ie</strong>, alongside the buzzing minds of
        <strong> Tribes Beekeepers Association</strong> and <strong>Tribes QRBG</strong>.
      </p>

      <h2>Get Started</h2>
      <p>
        Ready to take your beekeeping to the next level? Create an account and start managing
        your hives with HiveCraic today.
      </p>
      <div className="not-prose mt-4">
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          Sign Up or Log In
        </a>
      </div>

      <h2>Contact</h2>
      <p>
        Have questions or feedback? We&apos;d love to hear from you.
      </p>
      <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg mt-2 not-prose border border-gray-200 dark:border-slate-700">
        <p className="font-semibold text-gray-900 dark:text-gray-100">HiveCraic Support</p>
        <p className="text-gray-700 dark:text-gray-300">Email: support@tcbc.ie</p>
        <p className="text-gray-700 dark:text-gray-300">Website: tcbc.ie</p>
      </div>
    </div>
  )
}
