module.exports = async ({ github, context }, runId) => {
  const repo = context.repo;
  const jobs = (await github.rest.actions.listJobsForWorkflowRun({ ...repo, run_id: runId })).data.jobs;
  const failed = jobs.find(job => job.conclusion === 'failure');
  const report = { runId, failedJob: failed?.name ?? null, steps: failed?.steps?.map(step => ({ name: step.name, conclusion: step.conclusion })) ?? [], tail: [] };
  if (failed) {
    const result = await github.rest.actions.downloadJobLogsForWorkflowRun({ ...repo, job_id: failed.id });
    const text = typeof result.data === 'string' ? result.data : Buffer.from(result.data).toString('utf8');
    report.tail = text.split('\n').filter(line => !line.includes('##[debug]')).slice(-260).map(line => line
      .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '[redacted key]')
      .replace(/(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]+/g, '[redacted token]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted token]')
      .replace(/https?:\/\/[^\s<>]+/g, url => { try { const value = new URL(url); return `${value.protocol}//${value.hostname}${value.pathname}`; } catch { return '[url]'; } })
      .slice(0, 500));
  }
  const path = `.build-status/diagnosis-${runId}.json`;
  let sha;
  try { sha = (await github.rest.repos.getContent({ ...repo, path, ref: 'build-status' })).data.sha; }
  catch (error) { if (error.status !== 404) throw error; }
  await github.rest.repos.createOrUpdateFileContents({ ...repo, path, branch: 'build-status', sha,
    message: `Record diagnosis for Android run ${runId}`, content: Buffer.from(JSON.stringify(report, null, 2)).toString('base64') });
};
