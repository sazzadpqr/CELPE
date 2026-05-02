import { useLocation } from "wouter";

export function getApiUrl(path: string): string {
  return path;
}

export function getAuthHeader(): Record<string, string> {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}` };
}

export async function adminFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function adminSave<T>(
  path: string,
  data: unknown,
  method: "PUT" | "POST" | "DELETE" = "PUT",
): Promise<T> {
  return adminFetch<T>(path, {
    method,
    body: JSON.stringify(data),
  });
}
