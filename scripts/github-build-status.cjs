// GitHub Actions-only: publish small status records through Git so the coding
// workspace can inspect results even when GitHub's REST API is unavailable here.
module.exports = async ({ github, context }, state) => {
  const fs = require('node:fs');
  const repo = context.repo;
  const branch = 'build-status';
  try { await github.rest.git.getRef({ ...repo, ref: `heads/${branch}` }); }
  catch (error) {
    if (error.status !== 404) throw error;
    try { await github.rest.git.createRef({ ...repo, ref: `refs/heads/${branch}`, sha: context.sha }); }
    catch (creation) { if (![409, 422].includes(creation.status)) throw creation; }
  }
  const path = `.build-status/android-preview-${context.sha}.json`;
  let sha;
  try { sha = (await github.rest.repos.getContent({ ...repo, path, ref: branch })).data.sha; }
  catch (error) { if (error.status !== 404) throw error; }
  const read = name => { try { return JSON.parse(fs.readFileSync(name, 'utf8')); } catch { return null; } };
  const report = { state, sourceSha: context.sha, updatedAt: new Date().toISOString(), runId: context.runId,
    runUrl: `https://github.com/${repo.owner}/${repo.repo}/actions/runs/${context.runId}`,
    apkUrl: process.env.APK_URL || null, build: read('artifacts/android-build.json'),
    failure: read('artifacts/build-failure.json'), liveAuth: read('artifacts/live-auth-check.json') };
  await github.rest.repos.createOrUpdateFileContents({ ...repo, branch, path, sha,
    message: `Record Android preview ${state}`, content: Buffer.from(JSON.stringify(report, null, 2)).toString('base64') });
};
