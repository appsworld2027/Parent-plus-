import type { Student } from '../roster/model';
import type { Enrolment } from '../roster/model';
import type { Observation } from '../observations/model';
import type { Recipient } from '../observations/model';

export type NeedsYouStudent = { id: string; name: string };

// Check if a student is currently enrolled (active enrolment today)
export function hasActiveEnrolment(student: Student, enrolments: Enrolment[], today: string): boolean {
  if (student.archived_at) return false;
  return enrolments.some(e =>
    e.student_id === student.id &&
    e.starts_on <= today &&
    (!e.ends_on || e.ends_on >= today)
  );
}

// Check if a student has recorded feedback within the last 7 days
export function hasRecentRecordedFeedback(
  studentId: string,
  observations: Observation[],
  recipients: Recipient[],
  now: Date
): boolean {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find observations that name this student as a recipient
  const studentObservationIds = recipients
    .filter(r => r.student_id === studentId)
    .map(r => r.observation_id);

  return observations.some(obs =>
    studentObservationIds.includes(obs.id) &&
    obs.status === 'recorded' &&
    obs.recorded_at &&
    new Date(obs.recorded_at) >= sevenDaysAgo
  );
}

// Main function: get students who need feedback
export function getStudentsNeedingFeedback(
  students: Student[],
  enrolments: Enrolment[],
  observations: Observation[],
  recipients: Recipient[],
  timezone: string,
  now: Date = new Date()
): NeedsYouStudent[] {
  // Get today's date in the academy timezone
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

  return students
    .filter(student => hasActiveEnrolment(student, enrolments, today))
    .filter(student => !hasRecentRecordedFeedback(student.id, observations, recipients, now))
    .map(student => ({ id: student.id, name: student.name }));
}

// Format the count message
export function formatNeedsYouMessage(count: number): string {
  if (count === 1) return '1 child needs feedback';
  return `${count} children need feedback`;
}
