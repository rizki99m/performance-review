"use client";
import type {
  AppData,
  PerformanceReview,
  Question,
  Relationship,
  User,
} from "./types";
export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ClientApiError(response.status, body.error || "Request failed.");
  return body as T;
}
export const loadData = async () =>
  request<{ data: AppData; user: User }>("/api/data");
export const login = async (username: string, password: string) =>
  request<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  }).then((x) => x.user);
export const logout = async () => {
  await request("/api/auth/logout", { method: "POST" });
};
export const upsertUser = async (
  _data: AppData,
  user: Omit<User, "id"> & { id?: string; password?: string },
) => request("/api/users", { method: "POST", body: JSON.stringify(user) });
export const upsertQuestion = async (
  _data: AppData,
  relationship: Relationship,
  question: Partial<Question> & Pick<Question, "text" | "type">,
) =>
  request("/api/templates", {
    method: "POST",
    body: JSON.stringify({ relationship, question }),
  });
export const deleteQuestion = async (id: string) =>
  request(`/api/templates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
export const reorderQuestions = async (ids: string[]) =>
  request("/api/templates", { method: "PATCH", body: JSON.stringify({ ids }) });
export type RelationshipLink = {
  revieweeId: string;
  reviewerId: string;
  relationship: Exclude<Relationship, "SELF">;
};
export const createReview = async (
  _data: AppData,
  values: Pick<
    PerformanceReview,
    "title" | "description" | "startDate" | "endDate"
  >,
  revieweeIds: string[],
  relationships: RelationshipLink[],
) =>
  request<{ id: string }>("/api/reviews", {
    method: "POST",
    body: JSON.stringify({
      ...values,
      startDate: localDateTimeToIso(values.startDate),
      endDate: localDateTimeToIso(values.endDate),
      revieweeIds,
      relationships,
    }),
  });
export const deleteReview = async (id: string) =>
  request(`/api/reviews?id=${encodeURIComponent(id)}`, { method: "DELETE" });

export const updateReview = async (values: {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}) =>
  request("/api/reviews", {
    method: "PATCH",
    body: JSON.stringify({
      ...values,
      startDate: localDateTimeToIso(values.startDate),
      endDate: localDateTimeToIso(values.endDate),
    }),
  });

export const addAssignment = async (
  _data: AppData,
  reviewId: string,
  revieweeId: string,
  reviewerId: string,
  relationship: Exclude<Relationship, "SELF">,
) =>
  request("/api/assignments", {
    method: "POST",
    body: JSON.stringify({ reviewId, revieweeId, reviewerId, relationship }),
  });
export const saveAnswers = async (
  assignmentId: string,
  answers: Record<string, string | number>,
  submit: boolean,
) =>
  request("/api/answers", {
    method: "PUT",
    body: JSON.stringify({ assignmentId, answers, submit }),
  });
export function editable(review: PerformanceReview) {
  return review.status === "IN_PROGRESS";
}

function localDateTimeToIso(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date and time.");
  }

  return date.toISOString();
}
