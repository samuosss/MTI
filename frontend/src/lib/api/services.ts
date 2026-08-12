import { apiClient } from "../apiClient";
import type { ApiServiceRequest, ServiceRequestStatusValue } from "../apiTypes";

export interface ServiceRequestInput {
  name: string;
  email: string;
  service: string;
  scope?: string;
  details?: string;
}

export async function submitServiceRequest(payload: ServiceRequestInput): Promise<ApiServiceRequest> {
  const { data } = await apiClient.post<ApiServiceRequest>("/api/services", payload);
  return data;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function listServiceRequests(): Promise<ApiServiceRequest[]> {
  const { data } = await apiClient.get<ApiServiceRequest[]>("/api/services");
  return data;
}

export async function updateServiceRequestStatus(
  id: number,
  status: ServiceRequestStatusValue
): Promise<ApiServiceRequest> {
  const { data } = await apiClient.patch<ApiServiceRequest>(`/api/services/${id}/status`, { status });
  return data;
}
