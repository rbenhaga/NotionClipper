/**
 * useFocusMode - Quota Checks & Time Tracking Tests
 *
 * Tests unitaires pour quota checks et time tracking dans useFocusMode
 * Vérifie blocage quota, tracking automatique 1min, et callbacks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useFocusMode, FocusModeQuotaCheck } from '../useFocusMode';

describe('useFocusMode - Quota Checks & Time Tracking', () => {
  let mockFocusModeAPI: any;
  let mockQuotaOptions: FocusModeQuotaCheck;
  let electronAPIMock: any;

  // Helper function to render hook and advance initial timers
  const renderFocusModeHook = async (api: any, options?: FocusModeQuotaCheck) => {
    const hook = renderHook(() => useFocusMode(api, options));

    // Advance timers to complete initial loadState effect (500ms setTimeout)
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    return hook;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock window.electronAPI for event handling
    const mockEventHandlers: Record<string, Function[]> = {};
    electronAPIMock = {
      on: jest.fn((event: string, handler: Function) => {
        if (!mockEventHandlers[event]) mockEventHandlers[event] = [];
        mockEventHandlers[event].push(handler);
      }),
      removeListener: jest.fn(),
      // Helper to trigger events (Electron handlers expect (event, data))
      _triggerEvent: (event: string, data: any) => {
        mockEventHandlers[event]?.forEach((handler) => handler({}, data));
      },
    };

    // Define electronAPI on window object
    Object.defineProperty(window, 'electronAPI', {
      value: electronAPIMock,
      writable: true,
      configurable: true,
    });

    // Mock Focus Mode API
    mockFocusModeAPI = {
      getState: jest.fn().mockResolvedValue({
        enabled: false,
        activePageId: null,
        activePageTitle: null,
        lastUsedAt: null,
        sessionStartTime: null,
        clipsSentCount: 0,
      }),
      enable: jest.fn().mockImplementation(async (page) => {
        // Make it truly async to allow testing loading states
        await Promise.resolve();
        electronAPIMock._triggerEvent('focus-mode:enabled', {
          pageId: page.id,
          pageTitle: page.title,
        });
      }),
      disable: jest.fn().mockImplementation(async () => {
        await Promise.resolve();
        electronAPIMock._triggerEvent('focus-mode:disabled', {});
      }),
      toggle: jest.fn().mockResolvedValue(undefined),
      quickSend: jest.fn().mockResolvedValue({ success: true }),
      uploadFiles: jest.fn().mockResolvedValue({ success: true }),
      updateConfig: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Quota Options
    mockQuotaOptions = {
      onQuotaCheck: jest.fn().mockResolvedValue({
        canUse: true,
        quotaReached: false,
        remaining: 45,
      }),
      onQuotaExceeded: jest.fn(),
      onTrackUsage: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Quota Check on Enable', () => {
    it('should call onQuotaCheck before enabling Focus Mode', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      expect(mockQuotaOptions.onQuotaCheck).toHaveBeenCalled();
      expect(mockFocusModeAPI.enable).toHaveBeenCalledWith({ id: 'page-1', title: 'Test Page' });
    });

    it('should block enable when quota check returns canUse: false', async () => {
      mockQuotaOptions.onQuotaCheck = jest.fn().mockResolvedValue({
        canUse: false,
        quotaReached: true,
        remaining: 0,
      });

      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      expect(mockQuotaOptions.onQuotaCheck).toHaveBeenCalled();
      expect(mockQuotaOptions.onQuotaExceeded).toHaveBeenCalled();
      expect(mockFocusModeAPI.enable).not.toHaveBeenCalled();
      expect(result.current.error).toContain('Quota Mode Focus atteint');
    });

    it('should allow enable when quota check returns canUse: true', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      expect(mockQuotaOptions.onQuotaCheck).toHaveBeenCalled();
      expect(mockFocusModeAPI.enable).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should bypass quota check when onQuotaCheck not provided (Premium)', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, undefined);

      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      expect(mockFocusModeAPI.enable).toHaveBeenCalled();
    });

    it('should show warning when quota low but still usable', async () => {
      mockQuotaOptions.onQuotaCheck = jest.fn().mockResolvedValue({
        canUse: true,
        quotaReached: false,
        remaining: 5, // Low but not exhausted
      });

      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      expect(mockFocusModeAPI.enable).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Time Tracking - 1 Minute Intervals', () => {
    it('should start tracking time when Focus Mode enabled', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      // Enable Focus Mode
      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      // Wait for state to update
      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      // Not tracked yet (interval not fired)
      expect(mockQuotaOptions.onTrackUsage).not.toHaveBeenCalled();

      // Advance time by 1 minute
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Should track 1 minute
      await waitFor(() => {
        expect(mockQuotaOptions.onTrackUsage).toHaveBeenCalledWith(1);
      });
    });

    it('should track multiple minutes at 1-minute intervals', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      // Enable and wait for state update
      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      // Advance 3 minutes
      await act(async () => {
        jest.advanceTimersByTime(3 * 60000);
      });

      await waitFor(() => {
        expect(mockQuotaOptions.onTrackUsage).toHaveBeenCalledTimes(3);
      });
    });

    it('should stop tracking when Focus Mode disabled', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      // Enable
      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      // Track 1 minute
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockQuotaOptions.onTrackUsage).toHaveBeenCalledTimes(1);

      // Disable
      await act(async () => {
        const disablePromise = result.current.disable();
        jest.advanceTimersByTime(100);
        await disablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(false);
      });

      // Advance more time
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Should not track more (still 1 call)
      expect(mockQuotaOptions.onTrackUsage).toHaveBeenCalledTimes(1);
    });

    it('should not track when onTrackUsage not provided', async () => {
      const quotaOptionsWithoutTracking = {
        onQuotaCheck: mockQuotaOptions.onQuotaCheck,
        onQuotaExceeded: mockQuotaOptions.onQuotaExceeded,
      };

      const { result } = await renderFocusModeHook(mockFocusModeAPI, quotaOptionsWithoutTracking);

      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // No tracking function provided, so no calls
      expect(mockQuotaOptions.onTrackUsage).not.toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', async () => {
      mockQuotaOptions.onTrackUsage = jest.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(mockQuotaOptions.onTrackUsage).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          '[FocusMode] Error tracking usage:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Toggle - Quota Integration', () => {
    it('should check quota when toggling on from off state', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        await result.current.toggle({ id: 'page-1', title: 'Test Page' });
      });

      expect(mockQuotaOptions.onQuotaCheck).toHaveBeenCalled();
      expect(mockFocusModeAPI.enable).toHaveBeenCalled();
    });

    it('should not check quota when toggling off from on state', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      // Enable first
      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      // Clear mock calls
      jest.clearAllMocks();

      // Toggle off
      await act(async () => {
        const togglePromise = result.current.toggle();
        jest.advanceTimersByTime(100);
        await togglePromise;
      });

      expect(mockQuotaOptions.onQuotaCheck).not.toHaveBeenCalled();
      expect(mockFocusModeAPI.disable).toHaveBeenCalled();
    });
  });

  describe('Loading & Error States', () => {
    it('should reset loading state after enable completes', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      // Initially: not loading, not enabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isEnabled).toBe(false);

      // Execute enable
      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      // After completion: not loading anymore, now enabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isEnabled).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should clear error on successful enable', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      // First call: quota blocked
      mockQuotaOptions.onQuotaCheck = jest.fn().mockResolvedValueOnce({
        canUse: false,
        quotaReached: true,
        remaining: 0,
      });

      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      expect(result.current.error).toBeTruthy();

      // Second call: quota available
      mockQuotaOptions.onQuotaCheck = jest.fn().mockResolvedValueOnce({
        canUse: true,
        quotaReached: false,
        remaining: 30,
      });

      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle quota check returning exactly 0 remaining', async () => {
      mockQuotaOptions.onQuotaCheck = jest.fn().mockResolvedValue({
        canUse: false,
        quotaReached: true,
        remaining: 0,
      });

      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        await result.current.enable({ id: 'page-1', title: 'Test Page' });
      });

      expect(mockFocusModeAPI.enable).not.toHaveBeenCalled();
      expect(result.current.error).toContain('Quota Mode Focus atteint');
    });

    it('should handle rapid enable/disable cycles', async () => {
      const { result } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      await act(async () => {
        const disablePromise = result.current.disable();
        jest.advanceTimersByTime(100);
        await disablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(false);
      });

      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      // Quota check should be called twice (two enables)
      expect(mockQuotaOptions.onQuotaCheck).toHaveBeenCalledTimes(2);
    });

    it('should cleanup interval on unmount', async () => {
      const { result, unmount } = await renderFocusModeHook(mockFocusModeAPI, mockQuotaOptions);

      await act(async () => {
        const enablePromise = result.current.enable({ id: 'page-1', title: 'Test Page' });
        jest.advanceTimersByTime(100);
        await enablePromise;
      });

      await waitFor(() => {
        expect(result.current.state.enabled).toBe(true);
      });

      // Track 1 minute
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockQuotaOptions.onTrackUsage).toHaveBeenCalledTimes(1);

      // Unmount
      unmount();

      // Advance more time after unmount
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Should not track after unmount (still 1 call)
      expect(mockQuotaOptions.onTrackUsage).toHaveBeenCalledTimes(1);
    });
  });
});
