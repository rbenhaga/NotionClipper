/**
 * usePerformanceMonitor - Custom hook for monitoring component render performance
 * 
 * Provides performance measurement utilities for tracking render times
 * and ensuring compliance with performance targets (Req 11.1, 11.2, 11.3).
 * 
 * Performance targets:
 * - Render: <100ms for up to 10 pages (Req 11.1)
 * - Matching: <200ms for up to 10 pages (Req 11.2)
 * - Tab switch: <50ms view update (Req 11.3)
 * 
 * @module usePerformanceMonitor
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
  /** Name of the operation being measured */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Target duration in milliseconds */
  target: number;
  /** Whether the operation met the target */
  withinTarget: boolean;
  /** Timestamp when measurement was taken */
  timestamp: number;
}

/**
 * Performance targets for TOC operations (Req 11.1, 11.2, 11.3)
 */
export const PERFORMANCE_TARGETS = {
  /** Target render time for up to 10 pages */
  RENDER_MS: 100,
  /** Target matching time for up to 10 pages */
  MATCHING_MS: 200,
  /** Target tab switch time */
  TAB_SWITCH_MS: 50,
  /** Target insertion time per page */
  INSERTION_PER_PAGE_MS: 2000,
} as const;

/**
 * Options for the performance monitor hook
 */
export interface UsePerformanceMonitorOptions {
  /** Component or operation name for logging */
  name: string;
  /** Whether to log warnings when targets are exceeded */
  logWarnings?: boolean;
  /** Callback when a measurement is recorded */
  onMeasurement?: (measurement: PerformanceMeasurement) => void;
}

/**
 * Return type for the usePerformanceMonitor hook
 */
export interface UsePerformanceMonitorReturn {
  /** Start timing an operation */
  startMeasure: (operationName: string) => void;
  /** End timing and record the measurement */
  endMeasure: (operationName: string, target?: number) => PerformanceMeasurement | null;
  /** Get all recorded measurements */
  getMeasurements: () => PerformanceMeasurement[];
  /** Clear all measurements */
  clearMeasurements: () => void;
  /** Measure render time (call in useEffect) */
  measureRender: () => void;
}

/**
 * Custom hook for monitoring component performance
 * 
 * Tracks render times and operation durations to ensure compliance
 * with performance requirements (Req 11.1, 11.2, 11.3).
 * 
 * @param options - Configuration options
 * @returns Performance monitoring utilities
 * 
 * @example
 * ```tsx
 * const { startMeasure, endMeasure, measureRender } = usePerformanceMonitor({
 *   name: 'MultiPageTOCManager',
 *   logWarnings: true
 * });
 * 
 * // Measure render time
 * useEffect(() => {
 *   measureRender();
 * });
 * 
 * // Measure specific operation
 * startMeasure('smartMatching');
 * const results = engine.findMatchingSections(structures);
 * endMeasure('smartMatching', PERFORMANCE_TARGETS.MATCHING_MS);
 * ```
 */
export function usePerformanceMonitor(options: UsePerformanceMonitorOptions): UsePerformanceMonitorReturn {
  const { name, logWarnings = process.env.NODE_ENV === 'development', onMeasurement } = options;
  
  // Store active timers
  const timersRef = useRef<Map<string, number>>(new Map());
  
  // Store measurements
  const measurementsRef = useRef<PerformanceMeasurement[]>([]);
  
  // Track render start time
  const renderStartRef = useRef<number>(performance.now());

  /**
   * Start timing an operation
   */
  const startMeasure = useCallback((operationName: string) => {
    timersRef.current.set(operationName, performance.now());
  }, []);

  /**
   * End timing and record the measurement
   */
  const endMeasure = useCallback((operationName: string, target: number = PERFORMANCE_TARGETS.RENDER_MS): PerformanceMeasurement | null => {
    const startTime = timersRef.current.get(operationName);
    if (startTime === undefined) {
      if (logWarnings) {
        console.warn(`[Performance] No start time found for operation: ${operationName}`);
      }
      return null;
    }

    const duration = performance.now() - startTime;
    const withinTarget = duration <= target;
    
    const measurement: PerformanceMeasurement = {
      name: `${name}:${operationName}`,
      duration,
      target,
      withinTarget,
      timestamp: Date.now(),
    };

    measurementsRef.current.push(measurement);
    timersRef.current.delete(operationName);

    if (logWarnings && !withinTarget) {
      console.warn(
        `[Performance] ${name}:${operationName} took ${duration.toFixed(2)}ms (target: <${target}ms)`
      );
    }

    onMeasurement?.(measurement);

    return measurement;
  }, [name, logWarnings, onMeasurement]);

  /**
   * Get all recorded measurements
   */
  const getMeasurements = useCallback((): PerformanceMeasurement[] => {
    return [...measurementsRef.current];
  }, []);

  /**
   * Clear all measurements
   */
  const clearMeasurements = useCallback(() => {
    measurementsRef.current = [];
    timersRef.current.clear();
  }, []);

  /**
   * Measure render time (Req 11.1)
   * Call this in a useEffect to measure the render cycle
   */
  const measureRender = useCallback(() => {
    const duration = performance.now() - renderStartRef.current;
    const withinTarget = duration <= PERFORMANCE_TARGETS.RENDER_MS;

    const measurement: PerformanceMeasurement = {
      name: `${name}:render`,
      duration,
      target: PERFORMANCE_TARGETS.RENDER_MS,
      withinTarget,
      timestamp: Date.now(),
    };

    measurementsRef.current.push(measurement);

    if (logWarnings && !withinTarget) {
      console.warn(
        `[Performance] ${name}:render took ${duration.toFixed(2)}ms (target: <${PERFORMANCE_TARGETS.RENDER_MS}ms)`
      );
    }

    onMeasurement?.(measurement);

    // Reset for next render
    renderStartRef.current = performance.now();
  }, [name, logWarnings, onMeasurement]);

  // Reset render start time on each render
  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  return {
    startMeasure,
    endMeasure,
    getMeasurements,
    clearMeasurements,
    measureRender,
  };
}

/**
 * Utility function to measure async operation performance
 * 
 * @param operationName - Name of the operation
 * @param operation - Async function to measure
 * @param target - Target duration in milliseconds
 * @returns Result of the operation
 */
export async function measureAsync<T>(
  operationName: string,
  operation: () => Promise<T>,
  target: number = PERFORMANCE_TARGETS.RENDER_MS
): Promise<{ result: T; measurement: PerformanceMeasurement }> {
  const startTime = performance.now();
  const result = await operation();
  const duration = performance.now() - startTime;
  const withinTarget = duration <= target;

  const measurement: PerformanceMeasurement = {
    name: operationName,
    duration,
    target,
    withinTarget,
    timestamp: Date.now(),
  };

  if (process.env.NODE_ENV === 'development' && !withinTarget) {
    console.warn(
      `[Performance] ${operationName} took ${duration.toFixed(2)}ms (target: <${target}ms)`
    );
  }

  return { result, measurement };
}

/**
 * Utility function to measure sync operation performance
 * 
 * @param operationName - Name of the operation
 * @param operation - Sync function to measure
 * @param target - Target duration in milliseconds
 * @returns Result of the operation
 */
export function measureSync<T>(
  operationName: string,
  operation: () => T,
  target: number = PERFORMANCE_TARGETS.RENDER_MS
): { result: T; measurement: PerformanceMeasurement } {
  const startTime = performance.now();
  const result = operation();
  const duration = performance.now() - startTime;
  const withinTarget = duration <= target;

  const measurement: PerformanceMeasurement = {
    name: operationName,
    duration,
    target,
    withinTarget,
    timestamp: Date.now(),
  };

  if (process.env.NODE_ENV === 'development' && !withinTarget) {
    console.warn(
      `[Performance] ${operationName} took ${duration.toFixed(2)}ms (target: <${target}ms)`
    );
  }

  return { result, measurement };
}
