import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CaidoBackendSDK } from '../types';
import { init } from '../index';
import * as providerServiceModule from '../services/provider';
import * as settingsServiceModule from '../services/settings';

// Mock caido:utils module as it is used by dependencies
vi.mock("caido:utils", () => ({
  RequestSpec: vi.fn().mockImplementation((url: string) => ({
    url,
    setHeader: vi.fn(),
    setMethod: vi.fn(),
    setBody: vi.fn(),
  })),
}));

// Mock dependencies
vi.mock('../services/provider');
vi.mock('../services/settings');

describe('Backend Initialization', () => {
  let mockSdk: CaidoBackendSDK;
  let registerMock: ReturnType<typeof vi.fn>;

  // Spies for services
  let providerServiceMock: {
    createProvider: ReturnType<typeof vi.fn>;
    getProvider: ReturnType<typeof vi.fn>;
    updateProvider: ReturnType<typeof vi.fn>;
    deleteProvider: ReturnType<typeof vi.fn>;
    listProviders: ReturnType<typeof vi.fn>;
    toggleProviderEnabled: ReturnType<typeof vi.fn>;
    getOASTService: ReturnType<typeof vi.fn>;
  };

  let settingsServiceMock: {
    createSettings: ReturnType<typeof vi.fn>;
    getSettings: ReturnType<typeof vi.fn>;
    getCurrentSettings: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
    deleteSettings: ReturnType<typeof vi.fn>;
    listSettings: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();

    registerMock = vi.fn();
    mockSdk = {
      api: {
        register: registerMock,
      },
    } as unknown as CaidoBackendSDK;

    // Setup Provider Service Mock
    providerServiceMock = {
      createProvider: vi.fn(),
      getProvider: vi.fn(),
      updateProvider: vi.fn(),
      deleteProvider: vi.fn(),
      listProviders: vi.fn(),
      toggleProviderEnabled: vi.fn(),
      getOASTService: vi.fn(),
    };
    vi.mocked(providerServiceModule.getProviderService).mockReturnValue(providerServiceMock as any);

    // Setup Settings Service Mock
    settingsServiceMock = {
      createSettings: vi.fn(),
      getSettings: vi.fn(),
      getCurrentSettings: vi.fn(),
      updateSettings: vi.fn(),
      deleteSettings: vi.fn(),
      listSettings: vi.fn(),
    };
    vi.mocked(settingsServiceModule.getSettingsService).mockReturnValue(settingsServiceMock as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize services', () => {
    init(mockSdk);
    expect(providerServiceModule.initProviderService).toHaveBeenCalledWith(mockSdk);
    expect(settingsServiceModule.initSettingsService).toHaveBeenCalledWith(mockSdk);
  });

  describe('Provider API Registration', () => {
    it('should register createProvider and call service', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('createProvider', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'createProvider')?.[1];
      const mockProvider = { name: 'test' };

      // Call with (event, providerData)
      callback('event', mockProvider);
      expect(providerServiceMock.createProvider).toHaveBeenCalledWith(mockProvider);
    });

    it('should register getProvider and call service', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('getProvider', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'getProvider')?.[1];
      callback('test-id');
      expect(providerServiceMock.getProvider).toHaveBeenCalledWith('test-id');
    });

    it('should register updateProvider and call service with array args', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('updateProvider', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'updateProvider')?.[1];
      const updates = { name: 'updated' };

      // Call with (event, [id, updates])
      callback('event', ['test-id', updates]);
      expect(providerServiceMock.updateProvider).toHaveBeenCalledWith('test-id', updates);
    });

    it('should register updateProvider and call service with spread args', () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'updateProvider')?.[1];
      const updates = { name: 'updated' };

      // Call with (event, id, updates)
      callback('event', 'test-id', updates);
      expect(providerServiceMock.updateProvider).toHaveBeenCalledWith('test-id', updates);
    });

    it('should register deleteProvider and call service with array args', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('deleteProvider', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'deleteProvider')?.[1];

      // Call with (event, [id])
      callback('event', ['test-id']);
      expect(providerServiceMock.deleteProvider).toHaveBeenCalledWith('test-id');
    });

    it('should register deleteProvider and call service with plain arg', () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'deleteProvider')?.[1];

      // Call with (event, id)
      callback('event', 'test-id');
      expect(providerServiceMock.deleteProvider).toHaveBeenCalledWith('test-id');
    });

    it('should register listProviders and call service', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('listProviders', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'listProviders')?.[1];
      callback();
      expect(providerServiceMock.listProviders).toHaveBeenCalled();
    });

    it('should register toggleProviderEnabled and call service with array args', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('toggleProviderEnabled', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'toggleProviderEnabled')?.[1];

      // Call with (event, [id, enabled])
      callback('event', ['test-id', true]);
      expect(providerServiceMock.toggleProviderEnabled).toHaveBeenCalledWith('test-id', true);
    });

    it('should register toggleProviderEnabled and call service with spread args', () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'toggleProviderEnabled')?.[1];

      // Call with (event, id, enabled)
      callback('event', 'test-id', true);
      expect(providerServiceMock.toggleProviderEnabled).toHaveBeenCalledWith('test-id', true);
    });
  });

  describe('OAST API Registration', () => {
    it('should register registerAndGetPayload and call service', async () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('registerAndGetPayload', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'registerAndGetPayload')?.[1];
      const mockProvider = { type: 'BOAST' };
      const mockOASTService = { registerAndGetPayload: vi.fn().mockResolvedValue({ id: '1', payloadUrl: 'url' }) };

      providerServiceMock.getOASTService.mockReturnValue(mockOASTService);

      // Call with (event, provider)
      const result = await callback('event', mockProvider);

      expect(providerServiceMock.getOASTService).toHaveBeenCalledWith(mockProvider);
      expect(mockOASTService.registerAndGetPayload).toHaveBeenCalled();
      expect(result).toEqual({ id: '1', payloadUrl: 'url' });
    });

    it('should handle registerAndGetPayload when service is null', async () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'registerAndGetPayload')?.[1];

      providerServiceMock.getOASTService.mockReturnValue(null);

      const result = await callback('event', {});
      expect(result).toBeNull();
    });

    it('should register getOASTEvents and call service', async () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('getOASTEvents', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'getOASTEvents')?.[1];
      const mockProvider = { type: 'BOAST' };
      const mockEvents = [{ id: 1 }];
      const mockOASTService = { getEvents: vi.fn().mockResolvedValue(mockEvents) };

      providerServiceMock.getOASTService.mockReturnValue(mockOASTService);

      // Call with (event, provider)
      const result = await callback('event', mockProvider);

      expect(providerServiceMock.getOASTService).toHaveBeenCalledWith(mockProvider);
      expect(mockOASTService.getEvents).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });

    it('should handle getOASTEvents when service is null', async () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'getOASTEvents')?.[1];

      providerServiceMock.getOASTService.mockReturnValue(null);

      const result = await callback('event', {});
      expect(result).toEqual([]);
    });
  });

  describe('Settings API Registration', () => {
    it('should register createSettings and call service with parsed args', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('createSettings', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'createSettings')?.[1];
      const inputSettings = { pollingInterval: '60', payloadPrefix: 123 };

      // Call with (event, settingsData)
      callback('event', inputSettings);

      expect(settingsServiceMock.createSettings).toHaveBeenCalledWith({
        pollingInterval: 60,
        payloadPrefix: '123',
      });
    });

    it('should register getSettings and call service', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('getSettings', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'getSettings')?.[1];

      // Call with (event, id)
      callback('event', 'settings-id');
      expect(settingsServiceMock.getSettings).toHaveBeenCalledWith('settings-id');
    });

    it('should handle getSettings with missing id', () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'getSettings')?.[1];

      const result = callback('event', null);
      expect(result).toBeNull();
      expect(settingsServiceMock.getSettings).not.toHaveBeenCalled();
    });

    it('should register getCurrentSettings and call service', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('getCurrentSettings', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'getCurrentSettings')?.[1];

      callback();
      expect(settingsServiceMock.getCurrentSettings).toHaveBeenCalled();
    });

    it('should register updateSettings and call service with array args', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('updateSettings', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'updateSettings')?.[1];
      const updates = { pollingInterval: '120', payloadPrefix: 'pre' };

      // Call with (event, [id, updates])
      callback('event', ['settings-id', updates]);

      expect(settingsServiceMock.updateSettings).toHaveBeenCalledWith('settings-id', {
        pollingInterval: 120,
        payloadPrefix: 'pre',
      });
    });

    it('should register updateSettings and call service with spread args', () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'updateSettings')?.[1];
      const updates = { pollingInterval: 120 };

      // Call with (event, id, updates)
      callback('event', 'settings-id', updates);

      expect(settingsServiceMock.updateSettings).toHaveBeenCalledWith('settings-id', {
        pollingInterval: 120,
      });
    });

    it('should handle updateSettings with missing id', () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'updateSettings')?.[1];

      const result = callback('event', null, {});
      expect(result).toBeNull();
      expect(settingsServiceMock.updateSettings).not.toHaveBeenCalled();
    });

    it('should register deleteSettings and call service', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('deleteSettings', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'deleteSettings')?.[1];

      // Call with (event, id)
      callback('event', 'settings-id');
      expect(settingsServiceMock.deleteSettings).toHaveBeenCalledWith('settings-id');
    });

    it('should handle deleteSettings with missing id', () => {
      init(mockSdk);
      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'deleteSettings')?.[1];

      const result = callback('event', null);
      expect(result).toBe(false);
      expect(settingsServiceMock.deleteSettings).not.toHaveBeenCalled();
    });

    it('should register listSettings and call service', () => {
      init(mockSdk);
      expect(registerMock).toHaveBeenCalledWith('listSettings', expect.any(Function));

      const callback = registerMock.mock.calls.find((call: any[]) => call[0] === 'listSettings')?.[1];

      callback();
      expect(settingsServiceMock.listSettings).toHaveBeenCalled();
    });
  });
});
