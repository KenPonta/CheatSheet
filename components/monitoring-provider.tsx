'use client';

/**
 * Monitoring Provider Component
 * Initializes client-side monitoring services
 */

import { useEffect } from 'react';

interface MonitoringProviderProps {
  children: React.ReactNode;
}

export function MonitoringProvider({ children }: MonitoringProviderProps) {
  useEffect(() => {
    // Initialize basic client-side monitoring for Vercel deployment
    try {
      // Simple error tracking
      window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
      });

      console.log('Frontend monitoring initialized');
    } catch (error) {
      console.warn('Monitoring initialization failed:', error);
    }

    // Cleanup function
    return () => {
      // Basic cleanup
    };
  }, []);

  return <>{children}</>;
}