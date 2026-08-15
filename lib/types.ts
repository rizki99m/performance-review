export type Role = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type Relationship = "SELF" | "MANAGER" | "PEER" | "SUBORDINATE";
export type ReviewStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
export type AssignmentStatus = "NOT_STARTED" | "DRAFT" | "SUBMITTED";
export type QuestionType = "RATING_1_5" | "ESSAY";

export interface User { id: string; name: string; position: string; username: string; role: Role; status: UserStatus }
export interface Question { id: string; relationship: Relationship; text: string; type: QuestionType; order: number }
export interface Assignment { id: string; reviewId: string; reviewerId: string; revieweeId: string; relationship: Relationship; status: AssignmentStatus; answers: Record<string, string | number>; submittedAt?: string }
export interface PerformanceReview { id: string; title: string; description: string; startDate: string; endDate: string; status: ReviewStatus; questions: Question[]; assignments: Assignment[] }
export interface AppData { users: User[]; templates: Record<Relationship, Question[]>; reviews: PerformanceReview[] }
export interface Session { userId: string }
