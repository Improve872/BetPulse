export type User = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
};

export type AuthResponse = {
  user: User;
};

export type WalletBalance = {
  availableCents: number;
  heldCents: number;
  currency: string;
  updatedAt: string;
};

export type WalletOperation = {
  transactionId: string;
  availableCents: number;
  heldCents: number;
  currency: string;
  replayed: boolean;
  createdAt: string;
};

export type WalletTransaction = {
  transactionId: string;
  type: string;
  amountCents: number;
  createdAt: string;
};

type CsrfResponse = {
  headerName: string;
  parameterName: string;
  token: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

let csrfToken: CsrfResponse | null = null;

async function fetchCsrf(): Promise<CsrfResponse> {
  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(response.status, "CSRF_UNAVAILABLE", "No se pudo iniciar la sesión segura.");
  }

  csrfToken = (await response.json()) as CsrfResponse;
  return csrfToken;
}

export function resetCsrf(): void {
  csrfToken = null;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return request<T>(path, init, true);
}

async function request<T>(
  path: string,
  init: RequestInit,
  allowCsrfRetry: boolean,
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const isMutation = !SAFE_METHODS.has(method);

  if (isMutation) {
    const csrf = csrfToken ?? (await fetchCsrf());
    headers.set(csrf.headerName, csrf.token);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(path, {
    ...init,
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (isMutation && response.status === 403 && allowCsrfRetry) {
      csrfToken = null;
      await fetchCsrf();
      return request<T>(path, init, false);
    }

    const error = data as
      | { code?: string; message?: string; fieldErrors?: Record<string, string> }
      | null;
    throw new ApiError(
      response.status,
      error?.code ?? "ERROR",
      error?.message ?? "No se pudo completar la solicitud.",
      error?.fieldErrors,
    );
  }

  return data as T;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiFetch<User>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
