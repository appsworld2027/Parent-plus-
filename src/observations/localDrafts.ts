import { deviceStorage } from '../deviceStorage';
import { createObservationDrafts } from './drafts';
export const observationDrafts = createObservationDrafts(deviceStorage);
