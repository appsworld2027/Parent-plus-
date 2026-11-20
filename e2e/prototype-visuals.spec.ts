import {expect,test,type Page,type Locator} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {backend,login} from './support/backend';
import {parentBackend} from './support/parentBackend';

// The owner's HTML is an independent visual oracle, including its late skins.
// Block its network and self-host the same licensed variable font as the app.
async function reference(page:Page,role:'coach'|'parent') {
  const ref=await page.context().newPage();
  // Freeze time at 10:00 AM IST (04:30 UTC) so both app and reference see "Good morning"
  // and any time-based "late skins" are consistent.
  await ref.clock.install({time: new Date('2026-01-15T04:30:00Z')});
  await ref.setViewportSize(page.viewportSize()??{width:412,height:915});
  await ref.route('**/*',route=>route.abort());
  await ref.emulateMedia({reducedMotion:'reduce'});
  const file=role==='coach'?'ParentPlus_Coach_Tutor_App.html':'Parent_Plus_Aurora.html';
  const html=readFileSync(`founders/prototypes/${file}`,'utf8').replace(/<link\b[^>]*>/gi,'');
  await ref.setContent(html);
  const font=readFileSync('assets/fonts/BricolageGrotesque.ttf').toString('base64');
  await ref.addStyleTag({content:`@font-face{font-family:'Bricolage Grotesque';src:url(data:font/ttf;base64,${font});font-weight:200 800;font-style:normal}`});
  await ref.evaluate(()=>document.fonts.ready);
  // Wait for the prototype's initial render to complete.
  // Parent prototype renders .aurora-header; coach prototype renders into #scroll.
  if(role==='parent'){
    await ref.waitForSelector('.aurora-header', {state: 'attached', timeout: 10000});
  }else{
    await ref.waitForSelector('#scroll', {state: 'attached', timeout: 10000});
    // Wait for coach prototype's render() to populate content
    await ref.waitForFunction(()=>document.getElementById('scroll')!.innerHTML.length>0, {timeout: 10000});
  }
  await ref.evaluate(()=>{
    const probe=document.createElement('div');probe.id='visual-probes';
    probe.innerHTML='<div class="card">Card</div><button class="btn">Primary</button><input class="in" value="Reference"><input class="text-in" value="Reference"><div class="sheet">Sheet</div>';
    probe.style.cssText='position:absolute;top:0;left:0;opacity:0;pointer-events:none';document.querySelector('.phone')!.appendChild(probe);
  });
  return ref;
}

// Freeze the main page clock at 10:00 AM IST (04:30 UTC) for deterministic time-based styling.
test.beforeEach(async({page})=>{
  await page.clock.install({time: new Date('2026-01-15T04:30:00Z')});
});
async function css(element:Locator,property:string,pseudo?:string){return element.evaluate((node,args)=>getComputedStyle(node,args.pseudo).getPropertyValue(args.property),{property,pseudo});}
async function aurora(page:Page,ref:Page){
  const header=page.getByTestId('parent-aurora'),original=ref.locator('.aurora-header');
  await same(header,original,['background-image']);
  for(const [index,pseudo] of [[0,'::before'],[1,'::after']] as const) for(const property of ['background-image','background-size','opacity','filter']) await expect.poll(()=>css(header.locator(':scope > div[aria-hidden="true"]').nth(index),property)).toBe(await css(original,property,pseudo));
}
async function same(actual:Locator,ref:Locator,properties:string[]){for(const property of properties)await expect.poll(()=>css(actual,property),{message:`Prototype ${property}`}).toBe(await css(ref,property));}
async function parentHome(page:Page){
  await parentBackend(page);await login(page);
  await page.evaluate(()=>{
    const state=window.__parentFixture;
    state.families.push({id:'visual-family',owner_id:'00000000-0000-0000-0000-000000000001',name:'Fictional Family',parent_name:'Fictional Parent',timezone:'Asia/Kolkata'});
    // Use 'sky' color to match the reference prototype's next activity (School at 11:30)
    // at the frozen clock time of 10:00 AM IST. The reference's next-band uses the
    // next scheduled activity's color, which for Rudraansh (default kid) is 'sky'.
    state.children.push({id:'visual-child',family_id:'visual-family',name:'Fictional Tara',born_on:'2018-04-12',color:'sky',archived_at:null});
    sessionStorage.setItem('__fictional_parent',JSON.stringify(state));
  });
  await page.goto('/parent');await expect(page.getByRole('tab',{name:'Choose child Fictional Tara',exact:true})).toBeVisible();
}

const pageErrors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const errors:string[]=[];pageErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));});
test.afterEach(async({page},info)=>{expect(pageErrors.get(page)).toEqual([]);if(info.status!==info.expectedStatus)await page.screenshot({path:info.outputPath('visual-failure.png'),fullPage:true,animations:'disabled'});});

test('VIS-01 Coach auth and controls match the final prototype palette and loaded font',async({page},info)=>{
  await backend(page,{academy:true});await page.goto('/');
  const ref=await reference(page,'coach');
  await same(page.getByTestId('prototype-phone'),ref.locator('.phone'),['background-color']);
  await same(page.getByRole('button',{name:'Sign in',exact:true}),ref.locator('#visual-probes .btn'),['background-color','border-radius']);
  await same(page.getByRole('button',{name:'Sign in',exact:true}).locator('div').first(),ref.locator('#visual-probes .btn'),['color','font-size','font-weight']);
  await same(page.getByLabel('Email address',{exact:true}),ref.locator('#visual-probes .in'),['background-color','color','border-color','border-radius','font-size']);
  expect(await css(page.getByLabel('Email address',{exact:true}),'font-family')).toContain('Bricolage');
  expect(await page.evaluate(()=>Array.from(document.fonts).some(face=>face.family.includes('Bricolage')&&face.status==='loaded'&&face.weight==='200 800'))).toBe(true);
  await page.screenshot({path:info.outputPath('coach-auth.png'),fullPage:true,animations:'disabled'});await ref.close();
});

test('VIS-02 Coach heading, literal pastel stats, floating navigation and SVG match the reference',async({page},info)=>{
  await backend(page,{academy:true,readyClass:true});await login(page);
  const heading=page.getByRole('heading',{name:/Good (morning|afternoon|evening)/});await expect(heading).toBeVisible();
  const ref=await reference(page,'coach');
  await same(heading,ref.locator('.title h2'),['color','font-size','font-weight','line-height','letter-spacing']);
  await same(page.getByRole('tablist'),ref.locator('.nav'),['height','border-radius','background-color','border-color','bottom','left','right']);
  expect(await page.getByRole('tab',{name:'Today',exact:true}).locator('svg path').first().getAttribute('d')).toBe(await ref.locator('.nb.on svg path').first().getAttribute('d'));
  for(const [label,index] of [["View today's active classes",0],["View today's cancelled classes",1],['View saved attendance',2]] as const) await same(page.getByRole('button',{name:label,exact:true}),ref.locator('.stat').nth(index),['background-color','border-radius']);
  const dismiss=page.getByRole('button',{name:'Dismiss notification',exact:true});if(await dismiss.isVisible())await dismiss.click();
  await page.screenshot({path:info.outputPath('coach-today.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Create a batch',exact:true}).click();
  await same(page.getByLabel('Batch name',{exact:true}),ref.locator('#visual-probes .in'),['background-color','color','border-color','font-size']);
  await page.screenshot({path:info.outputPath('coach-batch-form.png'),fullPage:true,animations:'disabled'});
  for(const name of ['Schedule','Feedback','Students','Fees']) {
    await page.getByRole('tab',{name,exact:true}).click();
    await expect(page.getByRole('tab',{name,exact:true})).toHaveAttribute('aria-selected','true');
    await page.screenshot({path:info.outputPath(`coach-${name.toLowerCase()}.png`),fullPage:true,animations:'disabled'});
  }
  await ref.close();
});

test('VIS-03 Parent final Aurora surface, type, selected child and floating navigation match the reference',async({page},info)=>{
  await parentHome(page);const ref=await reference(page,'parent');await aurora(page,ref);
  await same(page.getByTestId('prototype-phone'),ref.locator('.phone'),['background-color']);
  await same(page.getByRole('heading',{name:/Good (morning|afternoon|evening)/}),ref.locator('.head-title h1'),['color','font-size','font-weight','line-height','letter-spacing']);
  const child=page.getByRole('tab',{name:'Choose child Fictional Tara',exact:true});
  await same(child,ref.locator('.kid.on'),['background-color','border-color','border-radius']);
  const nav=page.getByRole('tab',{name:'Parent Home',exact:true}).locator('..');
  await same(nav,ref.locator('.bottomnav .in'),['height','background-color','border-color','border-radius']);
  expect(await css(page.getByRole('tab',{name:'Parent Home',exact:true}).locator('div').last(),'font-size')).toBe('10px');
  await same(page.getByRole('button',{name:'Add a family plan',exact:true}),ref.locator('.next-band'),['background-color','border-radius']);
  await expect(page.getByRole('button',{name:'Log a family moment',exact:true}).locator('svg path').last()).toHaveAttribute('stroke','#000000');
  await page.screenshot({path:info.outputPath('parent-home.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Add a child',exact:true}).click();
  await same(page.getByLabel('Child name',{exact:true}),ref.locator('#visual-probes .text-in'),['background-color','color','border-color','font-size']);
  await page.screenshot({path:info.outputPath('parent-child-form.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Close Parent form',exact:true}).click();
  for(const name of ['Week','Together','Explore']) {
    await page.getByRole('tab',{name:`Parent ${name}`,exact:true}).click();
    await expect(page.getByRole('tab',{name:`Parent ${name}`,exact:true})).toHaveAttribute('aria-selected','true');
    await page.screenshot({path:info.outputPath(`parent-${name.toLowerCase()}.png`),fullPage:true,animations:'disabled'});
  }
  await ref.close();
});

test('VIS-04 desktop phone dimensions and modal containment preserve prototype geometry',async({page},info)=>{
  await page.setViewportSize({width:1280,height:1024});await backend(page,{academy:true});await page.goto('/');
  let ref=await reference(page,'coach');
  for(const property of ['width','height','border-radius'])await same(page.getByTestId('prototype-phone'),ref.locator('.phone'),[property]);
  await page.screenshot({path:info.outputPath('coach-desktop.png'),fullPage:true,animations:'disabled'});await ref.close();
  await page.unrouteAll();await parentHome(page);ref=await reference(page,'parent');
  await same(page.getByTestId('prototype-phone'),ref.locator('.phone'),['width','height','border-radius']);
  await page.getByRole('button',{name:'Add a child',exact:true}).click();
  const phone=await page.getByTestId('prototype-phone').boundingBox();const input=await page.getByLabel('Child name',{exact:true}).boundingBox();
  expect(phone).not.toBeNull();expect(input).not.toBeNull();expect(input!.x).toBeGreaterThanOrEqual(phone!.x);expect(input!.x+input!.width).toBeLessThanOrEqual(phone!.x+phone!.width);
  await page.screenshot({path:info.outputPath('parent-desktop-form.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Close Parent form',exact:true}).click();
  await page.setViewportSize({width:1280,height:800});await ref.setViewportSize({width:1280,height:800});
  await same(page.getByTestId('prototype-phone'),ref.locator('.phone'),['width','height']);
  expect(await page.evaluate(()=>document.body.scrollHeight)).toBeGreaterThan(800);
  await page.mouse.move(1100,400);await page.mouse.wheel(0,1000);
  await expect.poll(()=>page.evaluate(()=>document.body.scrollTop)).toBeGreaterThan(0);
  await expect.poll(async()=>(await page.getByTestId('prototype-phone').boundingBox())!.y+(await page.getByTestId('prototype-phone').boundingBox())!.height).toBeLessThanOrEqual(800);
  await page.evaluate(()=>document.body.scrollTop=0);
  await page.setViewportSize({width:320,height:740});await ref.setViewportSize({width:320,height:740});
  await same(page.getByTestId('prototype-phone'),ref.locator('.phone'),['width','height','border-radius']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);await aurora(page,ref);
  await page.screenshot({path:info.outputPath('parent-narrow.png'),fullPage:true,animations:'disabled'});await ref.close();
});
