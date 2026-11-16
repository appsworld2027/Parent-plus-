import {expect,test,type Page} from '@playwright/test';
import {parentBackend} from './support/parentBackend';
import {login} from './support/backend';
async function setup(page:Page){
 await parentBackend(page);await login(page);
 await page.evaluate(()=>{const s=window.__parentFixture;s.families.push({id:'family',owner_id:'00000000-0000-0000-0000-000000000001',name:'Family',parent_name:'Parent',timezone:'Asia/Kolkata'});s.children.push({id:'child',family_id:'family',name:'Family Ria',born_on:'2018-04-12',color:'sun',archived_at:null});s.invites['b'.repeat(64)]={student:window.__coachFixture.roster.students[0].id,used:false};s.inviteEmails['b'.repeat(64)]='coach@example.test';sessionStorage.setItem('__fictional_parent',JSON.stringify(s));});
 await page.getByRole('link',{name:'Open Parent space',exact:true}).click();
 await page.getByRole('tab',{name:'Parent Explore',exact:true}).click();await page.getByRole('button',{name:'Connect a coach',exact:true}).click();await page.getByLabel('Coach invitation code',{exact:true}).fill('b'.repeat(64));
}
test('forwarded invitation is refused for the wrong verified email before student details are shown',async({page})=>{
 await setup(page);await page.evaluate(()=>{window.__parentFixture.accountEmail='wrong@example.test';});await page.getByRole('button',{name:'Review coach invitation',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText('invitation or request is unavailable');
 await expect(page.getByText('Coach student: Fictional Ria → Your child: Family Ria',{exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>window.__parentFixture.requests.length)).toBe(0);
});
test('pending request can be rejected by coach and never creates a readable connection',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Review coach invitation',exact:true}).click();await page.getByRole('checkbox',{name:'This is the right coach and child',exact:true}).check();await page.getByRole('button',{name:'Request coach approval',exact:true}).click();
 await page.getByRole('tab',{name:'Parent Home',exact:true}).click();await expect(page.getByText('Waiting for coach approval',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Open Coach space',exact:true}).click();
 await expect(page.getByText('Parent’s child: Family Ria · birth date: 2018-04-12',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Approve Parent connection for Fictional Ria',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Reject Parent connection for Fictional Ria',exact:true}).click();await page.getByRole('link',{name:'Open Parent space',exact:true}).click();
 await page.getByRole('tab',{name:'Parent Explore',exact:true}).click();await expect(page.getByText('Connection request: rejected',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__parentFixture.links.length)).toBe(0);
});
test('missing security update pauses linking and feed while preserving private family records',async({page})=>{
 await parentBackend(page);await login(page);await page.evaluate(()=>{const state=window.__parentFixture;state.identityMissing=true;state.families.push({id:'family',owner_id:'00000000-0000-0000-0000-000000000001',name:'Family',parent_name:'Parent',timezone:'Asia/Kolkata'});state.children.push({id:'child',family_id:'family',name:'Ria',born_on:null,color:'sun',archived_at:null});sessionStorage.setItem('__fictional_parent',JSON.stringify(state));});
 await page.getByRole('link',{name:'Open Parent space',exact:true}).click();await expect(page.getByRole('alert')).toContainText('security update014');
 await expect(page.getByRole('tab',{name:'Choose child Ria',exact:true})).toBeVisible();
});
