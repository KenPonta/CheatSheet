'use client';

/**
 * Monitoring Provider Component
 * Initializes client-side monitoring services
 */

import { useEffect } from 'react';
import { initMonitoring } from '../backend/lib/monitoring';

interface MonitoringProviderProps {
  children: React.ReactNode;
}

export function MonitoringProvider({ children }: MonitoringProviderProps) {
  useEffect(() => {
    // Initialize monitoring services on the client side
    initMonitoring();

    // Cleanup function
    return () => {
      // Monitoring cleanup is handled by the monitoring services themselves
    };
  }, []);

  return <>{children}</>;
}