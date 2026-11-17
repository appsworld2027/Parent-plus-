import { deviceStorage } from '../deviceStorage';
import { createAttendanceDrafts } from './drafts';
export const attendanceDrafts = createAttendanceDrafts(deviceStorage);
