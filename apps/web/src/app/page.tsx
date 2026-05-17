'use client';
import { Header } from '@/components/Header';
import { StreamView } from '@/components/StreamView';
import { StatusBar } from '@/components/StatusBar';
import { Observatory } from '@/components/Observatory';
import { NeuralBackground } from '@/components/NeuralBackground';

export default function Home() {
  return (
    <main className="relative h-screen w-screen flex flex-col overflow-hidden aether-grid">
      {/* Background layer */}
      <NeuralBackground />
      {/* High-Performance App Header */}
      <Header />

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Main Observatory Graph */}
        <section className="flex-[2] relative aether-glass rounded-2xl overflow-hidden">
          <Observatory />
        </section>

        {/* Realtime Intelligence Stream */}
        <aside className="flex-1 max-w-md h-full">
          <StreamView />
        </aside>
      </div>

      {/* System Status Bar */}
      <StatusBar />
    </main>
  );
}
