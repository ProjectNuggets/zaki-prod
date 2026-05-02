/**
 * TDD tests for authStore.ts — pure in-memory Zustand store with isHydrating
 * Plan 03-01: Remove all localStorage coupling from authStore.
 */

// Mock localStorage to detect if authStore ever touches it
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Also mock @/lib/api to ensure the new authStore does NOT import from it
jest.mock("@/lib/api", () => ({
  getAuthToken: jest.fn(() => "stored-token-from-localstorage"),
  setAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
  apiRequest: jest.fn(),
}));

import { useAuthStore } from "./authStore";

beforeEach(() => {
  // Reset store to initial state between tests
  useAuthStore.setState({
    token: null,
    user: null,
    isHydrating: true,
  });

  // Reset all mock call counts
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});

describe("authStore — initial state", () => {
  test("token starts as null (NOT seeded from localStorage)", () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
  });

  test("user starts as null", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
  });

  test("isHydrating starts as true (boot starts in hydrating state)", () => {
    const state = useAuthStore.getState();
    expect(state.isHydrating).toBe(true);
  });
});

describe("authStore — setToken", () => {
  test("setToken(someJwt) stores token in memory only — no localStorage.setItem called", () => {
    const { setToken } = useAuthStore.getState();
    setToken("test-jwt-token");

    expect(useAuthStore.getState().token).toBe("test-jwt-token");
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  test("setToken(null) sets token to null, user to null, isHydrating to false", () => {
    // First set a token and user
    useAuthStore.setState({ token: "some-token", user: { id: 1, username: "alice" }, isHydrating: false });

    const { setToken } = useAuthStore.getState();
    setToken(null);

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isHydrating).toBe(false);
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  test("setToken(someJwt) does not call localStorage.removeItem", () => {
    const { setToken } = useAuthStore.getState();
    setToken("another-jwt");

    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });
});

describe("authStore — setHydrating", () => {
  test("setHydrating(false) sets isHydrating to false", () => {
    const { setHydrating } = useAuthStore.getState();
    setHydrating(false);

    expect(useAuthStore.getState().isHydrating).toBe(false);
  });

  test("setHydrating(true) sets isHydrating to true", () => {
    useAuthStore.setState({ isHydrating: false });
    const { setHydrating } = useAuthStore.getState();
    setHydrating(true);

    expect(useAuthStore.getState().isHydrating).toBe(true);
  });
});

describe("authStore — logout", () => {
  test("logout() sets token=null, user=null, isHydrating=false", () => {
    useAuthStore.setState({
      token: "active-token",
      user: { id: 2, username: "bob" },
      isHydrating: false,
    });

    const { logout } = useAuthStore.getState();
    logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isHydrating).toBe(false);
  });

  test("logout() does not call localStorage.removeItem", () => {
    useAuthStore.setState({ token: "active-token", user: { id: 2 }, isHydrating: false });

    const { logout } = useAuthStore.getState();
    logout();

    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });
});

describe("authStore — no api.ts imports used", () => {
  test("getAuthToken from api.ts mock is never called by authStore operations", () => {
    const { getAuthToken } = require("@/lib/api");

    // Exercise all store actions
    const store = useAuthStore.getState();
    store.setToken("test");
    store.setToken(null);
    store.setHydrating(false);
    store.logout();

    // The store must NOT have called getAuthToken
    expect(getAuthToken).not.toHaveBeenCalled();
  });

  test("setAuthToken from api.ts mock is never called by authStore operations", () => {
    const { setAuthToken } = require("@/lib/api");

    const store = useAuthStore.getState();
    store.setToken("test-jwt");

    expect(setAuthToken).not.toHaveBeenCalled();
  });

  test("clearAuthToken from api.ts mock is never called by authStore operations", () => {
    const { clearAuthToken } = require("@/lib/api");

    const store = useAuthStore.getState();
    store.logout();
    store.setToken(null);

    expect(clearAuthToken).not.toHaveBeenCalled();
  });
});

export {};
