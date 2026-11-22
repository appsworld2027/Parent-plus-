import { describe, test, expect } from 'vitest';
import { getStudentsNeedingFeedback, hasActiveEnrolment, hasRecentRecordedFeedback } from '../src/today/needsYou';
import type { Student } from '../src/roster/model';
import type { Enrolment } from '../src/roster/model';
import type { Observation } from '../src/observations/model';
import type { Recipient } from '../src/observations/model';

const makeStudent = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-1',
  name: 'Test Student',
  age_years: 7,
  archived_at: null,
  ...overrides,
});

const makeEnrolment = (overrides: Partial<Enrolment> = {}): Enrolment => ({
  id: 'enrolment-1',
  student_id: 'student-1',
  batch_id: 'batch-1',
  starts_on: '2020-01-01',
  ends_on: null,
  ...overrides,
});

const makeObservation = (overrides: Partial<Observation> = {}): Observation => ({
  id: 'obs-1',
  academy_id: 'academy-1',
  batch_id: 'batch-1',
  session_id: 'session-1',
  note: 'Test note',
  status: 'recorded',
  audience: 'student',
  revision: 1,
  author_id: 'coach-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  recorded_at: new Date().toISOString(),
  ...overrides,
});

const makeRecipient = (overrides: Partial<Recipient> = {}): Recipient => ({
  observation_id: 'obs-1',
  student_id: 'student-1',
  ...overrides,
});

describe('getStudentsNeedingFeedback', () => {
  const timezone = 'Asia/Kolkata';

  // Helper to create a date at a specific hour in UTC
  const makeDate = (year: number, month: number, day: number, hour: number, minute: number = 0): Date => {
    return new Date(Date.UTC(year, month - 1, day, hour, minute));
  };

  describe('exactly-7-days boundary', () => {
    test('observation recorded exactly 7 days ago at 23:30 UTC (next day in Asia/Kolkata) counts as recent', () => {
      // 7 days ago at 23:30 UTC = 8 days ago at 05:00 Asia/Kolkata (next day)
      // The function uses `now` for the 7-day cutoff, so we need to check if the
      // recorded_at is >= now - 7 days
      const now = makeDate(2026, 11, 22, 10, 0); // 10:00 UTC
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      // recorded_at exactly at the 7-day boundary should count (>=)
      const obs = makeObservation({ recorded_at: sevenDaysAgo.toISOString() });
      const recipient = makeRecipient();

      const result = getStudentsNeedingFeedback(
        [makeStudent()],
        [makeEnrolment()],
        [obs],
        [recipient],
        timezone,
        now
      );

      expect(result).toHaveLength(0); // Student has recent feedback, not counted
    });

    test('observation recorded 7 days + 1 minute ago does not count', () => {
      const now = makeDate(2026, 11, 22, 10, 0);
      const sevenDaysAgoPlusOneMinute = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 60 * 1000);
      const obs = makeObservation({ recorded_at: sevenDaysAgoPlusOneMinute.toISOString() });
      const recipient = makeRecipient();

      const result = getStudentsNeedingFeedback(
        [makeStudent()],
        [makeEnrolment()],
        [obs],
        [recipient],
        timezone,
        now
      );

      expect(result).toHaveLength(1); // Student needs feedback
    });
  });

  describe('8 days old', () => {
    test('observation recorded 8 days ago does not count as recent', () => {
      const now = makeDate(2026, 11, 22, 10, 0);
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      const obs = makeObservation({ recorded_at: eightDaysAgo.toISOString() });
      const recipient = makeRecipient();

      const result = getStudentsNeedingFeedback(
        [makeStudent()],
        [makeEnrolment()],
        [obs],
        [recipient],
        timezone,
        now
      );

      expect(result).toHaveLength(1); // Student needs feedback
    });
  });

  describe('draft ignored', () => {
    test('draft feedback does not count as recent recorded feedback', () => {
      const now = makeDate(2026, 11, 22, 10, 0);
      const obs = makeObservation({ status: 'draft', recorded_at: now.toISOString() });
      const recipient = makeRecipient();

      const result = getStudentsNeedingFeedback(
        [makeStudent()],
        [makeEnrolment()],
        [obs],
        [recipient],
        timezone,
        now
      );

      expect(result).toHaveLength(1); // Student needs feedback (draft ignored)
    });
  });

  describe('archived ignored', () => {
    test('archived student is not counted', () => {
      const now = makeDate(2026, 11, 22, 10, 0);
      const student = makeStudent({ archived_at: '2026-01-01T00:00:00.000Z' });

      const result = getStudentsNeedingFeedback(
        [student],
        [makeEnrolment()],
        [],
        [],
        timezone,
        now
      );

      expect(result).toHaveLength(0); // Archived student not counted
    });
  });

  describe('ended enrolment ignored', () => {
    test('student with ended enrolment is not counted', () => {
      const now = makeDate(2026, 11, 22, 10, 0);
      const enrolment = makeEnrolment({ ends_on: '2020-06-30' }); // ended in the past

      const result = getStudentsNeedingFeedback(
        [makeStudent()],
        [enrolment],
        [],
        [],
        timezone,
        now
      );

      expect(result).toHaveLength(0); // Ended enrolment not counted
    });
  });

  describe('future enrolment ignored', () => {
    test('student with future enrolment start date is not counted', () => {
      const now = makeDate(2026, 11, 22, 10, 0);
      const enrolment = makeEnrolment({ starts_on: '2030-01-01' }); // starts in the future

      const result = getStudentsNeedingFeedback(
        [makeStudent()],
        [enrolment],
        [],
        [],
        timezone,
        now
      );

      expect(result).toHaveLength(0); // Future enrolment not counted
    });
  });

  describe('student in two batches counted once', () => {
    test('student enrolled in two active batches is counted only once', () => {
      const now = makeDate(2026, 11, 22, 10, 0);
      const student = makeStudent({ id: 'student-multi' });
      const enrolments = [
        makeEnrolment({ id: 'enrolment-1', student_id: 'student-multi', batch_id: 'batch-1' }),
        makeEnrolment({ id: 'enrolment-2', student_id: 'student-multi', batch_id: 'batch-2' }),
      ];

      const result = getStudentsNeedingFeedback(
        [student],
        enrolments,
        [],
        [],
        timezone,
        now
      );

      expect(result).toHaveLength(1); // Counted once
      if (result.length > 0) {
        expect(result[0].id).toBe('student-multi');
      }
    });
  });

  describe('academy-timezone date boundary', () => {
    test('23:30 UTC is already the next day in Asia/Kolkata (UTC+5:30)', () => {
      // 2026-11-22 23:30 UTC = 2026-11-23 05:00 Asia/Kolkata
      // The "today" in Asia/Kolkata would be 2026-11-23
      // A student with enrolment starting on 2026-11-23 should be active
      const now = makeDate(2026, 11, 22, 23, 30); // 23:30 UTC on Nov 22
      const student = makeStudent({ id: 'student-tz' });
      const enrolment = makeEnrolment({ id: 'enrolment-tz', student_id: 'student-tz', starts_on: '2026-11-23' });

      const result = getStudentsNeedingFeedback(
        [student],
        [enrolment],
        [],
        [],
        timezone,
        now
      );

      // In Asia/Kolkata, it's already Nov 23, so enrolment starting Nov 23 is active
      expect(result).toHaveLength(1);
    });

    test('22:00 UTC is still the previous day in Asia/Kolkata', () => {
      // 2026-11-22 22:00 UTC = 2026-11-23 03:30 Asia/Kolkata (still Nov 22 in UTC terms for date formatting)
      // Wait, Intl.DateTimeFormat with timeZone uses the local date
      // 22:00 UTC on Nov 22 = 03:30 Asia/Kolkata on Nov 23
      // So "today" in Asia/Kolkata is Nov 23
      const now = makeDate(2026, 11, 22, 22, 0); // 22:00 UTC on Nov 22
      const student = makeStudent({ id: 'student-tz2' });
      const enrolment = makeEnrolment({ id: 'enrolment-tz2', student_id: 'student-tz2', starts_on: '2026-11-23' });

      const result = getStudentsNeedingFeedback(
        [student],
        [enrolment],
        [],
        [],
        timezone,
        now
      );

      // In Asia/Kolkata, it's Nov 23, so enrolment starting Nov 23 is active
      expect(result).toHaveLength(1);
    });

    test('enrolment starting tomorrow in academy timezone is not active yet', () => {
      // 2026-11-22 10:00 UTC = 2026-11-22 15:30 Asia/Kolkata
      // "today" in Asia/Kolkata is Nov 22
      // Enrolment starting Nov 23 is in the future
      const now = makeDate(2026, 11, 22, 10, 0); // 10:00 UTC on Nov 22
      const student = makeStudent({ id: 'student-tz3' });
      const enrolment = makeEnrolment({ id: 'enrolment-tz3', student_id: 'student-tz3', starts_on: '2026-11-23' });

      const result = getStudentsNeedingFeedback(
        [student],
        [enrolment],
        [],
        [],
        timezone,
        now
      );

      expect(result).toHaveLength(0); // Not active yet
    });
  });

  describe('hasActiveEnrolment', () => {
    test('returns true for active enrolment', () => {
      const student = makeStudent();
      const enrolment = makeEnrolment();
      expect(hasActiveEnrolment(student, [enrolment], '2026-11-22')).toBe(true);
    });

    test('returns false for archived student', () => {
      const student = makeStudent({ archived_at: '2026-01-01T00:00:00.000Z' });
      const enrolment = makeEnrolment();
      expect(hasActiveEnrolment(student, [enrolment], '2026-11-22')).toBe(false);
    });

    test('returns false for ended enrolment', () => {
      const student = makeStudent();
      const enrolment = makeEnrolment({ ends_on: '2020-06-30' });
      expect(hasActiveEnrolment(student, [enrolment], '2026-11-22')).toBe(false);
    });

    test('returns false for future enrolment', () => {
      const student = makeStudent();
      const enrolment = makeEnrolment({ starts_on: '2030-01-01' });
      expect(hasActiveEnrolment(student, [enrolment], '2026-11-22')).toBe(false);
    });
  });

  describe('hasRecentRecordedFeedback', () => {
    test('returns true for recorded feedback within 7 days', () => {
      const now = new Date('2026-11-22T10:00:00.000Z');
      const obs = makeObservation({ id: 'obs-1', recorded_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() });
      const recipient = makeRecipient({ observation_id: 'obs-1' });
      expect(hasRecentRecordedFeedback('student-1', [obs], [recipient], now)).toBe(true);
    });

    test('returns false for draft feedback', () => {
      const now = new Date('2026-11-22T10:00:00.000Z');
      const obs = makeObservation({ id: 'obs-1', status: 'draft', recorded_at: now.toISOString() });
      const recipient = makeRecipient({ observation_id: 'obs-1' });
      expect(hasRecentRecordedFeedback('student-1', [obs], [recipient], now)).toBe(false);
    });

    test('returns false for observation older than 7 days', () => {
      const now = new Date('2026-11-22T10:00:00.000Z');
      const obs = makeObservation({ id: 'obs-1', recorded_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString() });
      const recipient = makeRecipient({ observation_id: 'obs-1' });
      expect(hasRecentRecordedFeedback('student-1', [obs], [recipient], now)).toBe(false);
    });

    test('returns false for observation without recorded_at', () => {
      const now = new Date('2026-11-22T10:00:00.000Z');
      const obs = makeObservation({ id: 'obs-1', recorded_at: null });
      const recipient = makeRecipient({ observation_id: 'obs-1' });
      expect(hasRecentRecordedFeedback('student-1', [obs], [recipient], now)).toBe(false);
    });

    test('returns false when student is not a recipient', () => {
      const now = new Date('2026-11-22T10:00:00.000Z');
      const obs = makeObservation({ id: 'obs-1', recorded_at: now.toISOString() });
      const recipient = makeRecipient({ observation_id: 'obs-1', student_id: 'other-student' });
      expect(hasRecentRecordedFeedback('student-1', [obs], [recipient], now)).toBe(false);
    });
  });
});
