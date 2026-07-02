'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const GraphMap = dynamic(
  () =>
    import('@/components/GraphMap').catch((err) => {
      console.error('Failed to load GraphMap chunk, reloading page...', err);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return { default: () => null };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center">
        <span className="text-slate-400">Loading Intelligence Map...</span>
      </div>
    ),
  }
);

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Map rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full rounded-2xl bg-red-50 flex flex-col items-center justify-center border border-red-200 p-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-700 font-semibold">Failed to load the map component.</p>
          <p className="text-red-500 text-sm">Please refresh the page to try again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MapWrapper(props: any) {
  return (
    <ErrorBoundary>
      <GraphMap {...props} />
    </ErrorBoundary>
  );
}
