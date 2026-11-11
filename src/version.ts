import app from '../app.json';
export const appVersion = app.expo.version;
export const buildRevision = process.env.EXPO_PUBLIC_BUILD_SHA?.slice(0, 7) ?? 'local';
export const diagnosticBuild = `${appVersion}+${buildRevision}`;
