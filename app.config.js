module.exports = ({ config }) => {
  if (process.env.PARENTPLUS_BUILD_VARIANT !== 'preview') return config;
  return {
    ...config,
    name: 'Parent Plus Coach Preview',
    android: { ...config.android, package: 'com.parentplus.coach.preview' },
  };
};
