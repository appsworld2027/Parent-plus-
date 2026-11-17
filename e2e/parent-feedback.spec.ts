import { expect, test, type Page } from '@playwright/test';
import { login } from './support/backend';
import { classMediaBackend } from './support/classMediaBackend';

async function setup(page:Page) { await classMediaBackend(page);await login(page); }
async function openMedia(page:Page) {
  await page.getByRole('tab',{name:'Schedule',exact:true}).click();
  await page.getByRole('button',{name:'Attendance for Fictional Clay Class at 16:00',exact:true}).click();
  await page.getByRole('button',{name:'Class photos, videos and consent',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Student consent record',exact:true})).toBeVisible();
}
async function permission(page:Page) {
  await page.getByRole('combobox',{name:'Student consent record',exact:true}).selectOption(await page.evaluate(()=>window.__coachFixture.roster.students[0].id));
  await page.getByLabel('Consenting guardian name',{exact:true}).fill('Fictional Parent');
  await page.getByLabel('Permission evidence or withdrawal note',{exact:true}).fill('Guardian signed written class-media permission on 16 November.');
  for(const name of ['Guardian permits class photos','Guardian permits class videos','Guardian permits sharing class media with parents','I confirm this records the guardian’s actual decision'])await page.getByRole('checkbox',{name,exact:true}).check();
  await page.getByRole('button',{name:'Save guardian permission',exact:true}).click();
  await expect(page.getByText('Guardian permission recorded. Review who appears before adding media.',{exact:true})).toBeVisible();
}
async function selectSubjects(page:Page) {
  await page.getByRole('checkbox',{name:'Media includes Fictional Ria',exact:true}).check();
  await page.getByRole('checkbox',{name:'Everyone pictured is selected above',exact:true}).check();
}
async function feedback(page:Page,linked=false) {
  await page.getByRole('tab',{name:'Feedback',exact:true}).click();
  await page.getByRole('button',{name:'Write feedback',exact:true}).click();
  await page.getByRole('combobox',{name:'Feedback batch',exact:true}).selectOption(await page.evaluate(()=>window.__coachFixture.roster.batches[0].id));
  if(linked)await page.getByRole('combobox',{name:'Linked class (optional)',exact:true}).selectOption(await page.evaluate(()=>window.__coachFixture.classes[0].id));
  await page.getByRole('combobox',{name:'Student for this feedback',exact:true}).selectOption(await page.evaluate(()=>window.__coachFixture.roster.students[0].id));
  await page.getByLabel('Observation text',{exact:true}).fill('Fictional Ria shaped a bowl independently. Practise a smooth rim.');
  await page.getByRole('button',{name:'Save feedback',exact:true}).click();

  await expect(page.getByRole('button',{name:'Review and share to Parent',exact:true})).toBeEnabled();
}
async function prepare(page:Page) {
  await page.getByRole('button',{name:'Review and share to Parent',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Parent handoff for Fictional Ria',exact:true})).toBeChecked();
  await expect(page.getByRole('checkbox',{name:'I reviewed the feedback, recipients and media for parents',exact:true})).toBeEnabled();
}
async function approve(page:Page) {
  await page.getByRole('checkbox',{name:'I reviewed the feedback, recipients and media for parents',exact:true}).check();
  await page.getByRole('button',{name:'Share approved feedback to Parent',exact:true}).click();
}

test('media capture is blocked before consent; a lost video-upload result retries one immutable object',async({page},info)=>{
  await setup(page);await openMedia(page);await selectSubjects(page);
  await expect(page.getByRole('button',{name:'Choose consented class video',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>window.__mediaFixture.uploads)).toHaveLength(0);
  await permission(page);await selectSubjects(page);
  await page.evaluate(()=>{window.__mediaFixture.loseFinish=true;});
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Choose consented class video',exact:true}).click();
  await (await chooser).setFiles({name:'fictional.mp4',mimeType:'video/mp4',buffer:Buffer.from([0,0,0,24,...Array.from('ftypisom',char=>char.charCodeAt(0)),0,0,0,0])});
  await expect(page.getByRole('button',{name:'Retry same class media upload',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Retry same class media upload',exact:true}).click();
  await expect(page.getByText('Saved class media (1)',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.__mediaFixture.uploads)).toHaveLength(1);
  expect(await page.evaluate(()=>window.__mediaFixture.media.length)).toBe(1);
  await page.screenshot({path:info.outputPath('consented-class-video.png'),fullPage:true});
  await page.evaluate(()=>{window.__mediaFixture.consents[0].allow_videos=false;});
  await page.getByRole('button',{name:'Choose consented class video',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Confirm everyone pictured');
  expect(await page.evaluate(()=>window.__mediaFixture.uploads)).toHaveLength(1);
});

test('parent approval saves a held per-child feedback snapshot with consented video, persists and cancels',async({page},info)=>{
  await setup(page);await openMedia(page);await permission(page);await selectSubjects(page);
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose consented class video',exact:true}).click();
  await (await chooser).setFiles({name:'fictional.mp4',mimeType:'video/mp4',buffer:Buffer.from([0,0,0,24,...Array.from('ftypisom',char=>char.charCodeAt(0)),0,0,0,0])});
  await expect(page.getByText('Saved class media (1)',{exact:true})).toBeVisible();
  await feedback(page,true);await prepare(page);
  await page.getByRole('checkbox',{name:'Include class video 1',exact:true}).check();
  await approve(page);
  await expect(page.getByRole('heading',{name:'Reviewed and saved — awaiting parent connection',exact:true})).toBeVisible();
  const snapshot=await page.evaluate(()=>window.__mediaFixture.handoffs[0]);
  expect(snapshot.state).toBe('awaiting_parent_link');expect(snapshot.media_ids).toHaveLength(1);expect(snapshot.snapshot.note).toContain('shaped a bowl');
  expect(JSON.stringify(snapshot)).not.toContain('signedUrl');
  await page.screenshot({path:info.outputPath('reviewed-parent-handoff.png'),fullPage:true});
  await page.reload();await page.getByRole('tab',{name:'Feedback',exact:true}).click();
  await page.getByRole('button',{name:'Open recorded observation',exact:true}).click();await prepare(page);
  await expect(page.getByText(/Fictional Ria · revision 1 · Awaiting verified parent connection/)).toBeVisible();
  await page.getByRole('button',{name:'Cancel Parent handoff for Fictional Ria',exact:true}).click();
  await expect(page.getByText(/Cancelled — retained in history/)).toBeVisible();
});

test('lost parent approval freezes the exact review and retries without another held record',async({page})=>{
  await setup(page);await feedback(page);await prepare(page);
  await page.evaluate(()=>{window.__mediaFixture.loseQueue=true;});
  await approve(page);
  await expect(page.getByRole('button',{name:'Retry same Parent approval',exact:true})).toBeVisible();
  await expect(page.getByLabel('Observation text',{exact:true})).not.toBeEditable();
  await expect(page.getByRole('checkbox',{name:'Parent handoff for Fictional Ria',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Retry same Parent approval',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Reviewed and saved — awaiting parent connection',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.__mediaFixture.handoffs.length)).toBe(1);
  expect(await page.evaluate(()=>Object.keys(window.__mediaFixture.requests).length)).toBe(1);
  expect(await page.evaluate(()=>window.__coachFixture.calls.some(path=>/\/send|notification|webhook/.test(path)))).toBe(false);
});

test('missing new database update blocks media/parent holding and leaves ordinary feedback usable',async({page})=>{
  await setup(page);await page.evaluate(()=>{window.__mediaFixture.missing=true;});
  await page.getByRole('tab',{name:'Schedule',exact:true}).click();await page.getByRole('button',{name:'Attendance for Fictional Clay Class at 16:00',exact:true}).click();
  await page.getByRole('button',{name:'Class photos, videos and consent',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('not enabled for this workspace yet');
  await expect(page.getByRole('button',{name:'Choose consented class video',exact:true})).toHaveCount(0);
  await feedback(page);await page.getByRole('button',{name:'Review and share to Parent',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Existing feedback and WhatsApp remain available'})).toBeVisible();
  expect(await page.evaluate(()=>window.__mediaFixture.handoffs.length)).toBe(0);
});
