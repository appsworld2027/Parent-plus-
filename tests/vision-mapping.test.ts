import {expect,it} from 'vitest';
import {mapVisionResponse} from '../supabase/functions/scan-roster/vision';
function word(text:string,x:number,y:number,confidence=0.98){return {symbols:[...text].map(text=>({text})),boundingBox:{vertices:[{x,y},{x:x+text.length*7,y},{x:x+text.length*7,y:y+14},{x,y:y+14}]},confidence};}
const header=[word('Student',20,10),word('Name',80,10),word('Age',280,10),word('Guardian',380,10),word('Name',450,10),word('Phone',640,10),word('Level',850,10)];
function row(name='Fictional Tara',y=40){return [...name.split(' ').map((n,i)=>word(n,20+i*85,y)),word('9',290,y),word('Meera',390,y),word('Shah',470,y),word('9876543210',650,y),word('Intermediate',850,y)];}
function vision(words:ReturnType<typeof word>[],text='Student Name Age Guardian Name Phone Level\nFictional Tara 9 Meera Shah 9876543210 Intermediate'){
 return {responses:[{fullTextAnnotation:{text,pages:[{blocks:[{paragraphs:[{words}]}]}]}}]};
}
it('maps register columns by position even if provider text reading order differs',()=>{
 const result=mapVisionResponse(vision([...header,...row()], 'Student Name\nFictional Tara\nAge\n9\nGuardian Name\nMeera Shah\nPhone\n9876543210\nLevel\nIntermediate'));
 expect(result.students).toHaveLength(1);
 expect(result.students[0]).toMatchObject({name:'Fictional Tara',age:9,guardian:'Meera Shah',phone:'9876543210',proficiency:'intermediate'});
 expect(result.students[0].warnings.join(' ')).toMatch(/guardian/);
});
it('reads explicit labelled admission fields, including multiple fields on one line',()=>{
 const result=mapVisionResponse({responses:[{fullTextAnnotation:{text:'Student name: Fictional Tara Age: 9\nGuardian name: Meera Shah\nPhone: 9876543210\nEmail: meera@example.test\nLevel: Beginner\nDOB: 01/01/2017'}}]});
 expect(result.students).toHaveLength(1);expect(result.students[0]).toMatchObject({name:'Fictional Tara',age:9,guardian:'Meera Shah',email:'meera@example.test',phone:'9876543210',proficiency:'beginner'});
});
it('keeps Hindi names and converts explicitly written Devanagari digits without inferring ages',()=>{
 const words=[word('नाम',20,10),word('उम्र',280,10),word('अभिभावक',380,10),word('मोबाइल',640,10),...row('रिया शाह').slice(0,2),word('८',290,40),word('मीरा',390,40),word('शाह',470,40),word('९८७६५४३२१०',650,40)];
 expect(mapVisionResponse(vision(words)).students[0]).toMatchObject({name:'रिया शाह',age:8,guardian:'मीरा शाह',phone:'9876543210',proficiency:'unassessed'});
 expect(mapVisionResponse({responses:[{fullTextAnnotation:{text:'Name: Ria\nDOB: 01/01/2017\nGuardian: Meera'}}]}).students[0].age).toBeNull();
});
it('returns raw text for unclear layouts, single labelled names and portraits without text',()=>{
 expect(mapVisionResponse({responses:[{fullTextAnnotation:{text:'Fictional Tara\nFictional Ria'}}]})).toMatchObject({students:[],rawLines:['Fictional Tara','Fictional Ria']});
 expect(mapVisionResponse(vision([word('Name:',20,10),word('Ria',100,10)],'Name: Ria')).students[0]).toMatchObject({name:'Ria',age:null});
 expect(mapVisionResponse({responses:[{}]})).toMatchObject({students:[],rawLines:[]});
});
it('leaves uncertain ages, contacts and learning levels blank and exposes review warnings',()=>{
 const words=[...header,...row().filter(w=>!['9','Intermediate','9876543210'].includes(w.symbols.map(s=>s.text).join(''))),word('8O',290,40,0.3),word('unknown',650,40),word('Grade2',850,40)];
 const result=mapVisionResponse(vision(words)).students[0];expect(result).toMatchObject({age:null,phone:null,proficiency:'unassessed'});expect(result.warnings.join(' ')).toMatch(/low recognition/);
});
it('skips repeated headers and totals while preserving independent rows',()=>{
 const h2=header.map(w=>({...w,boundingBox:{vertices:w.boundingBox.vertices.map(v=>({...v,y:v.y+60}))}}));
 const result=mapVisionResponse(vision([...header,...row(),...h2,...row('Fictional Ria',100),word('Total',20,130),word('2',290,130)]));
 expect(result.students.map(s=>s.name)).toEqual(['Fictional Tara','Fictional Ria']);
 expect(result.warnings.join(' ')).toMatch(/repeated header/);
});
it('never uses a student mobile column as a guardian phone field',()=>{
 const result=mapVisionResponse(vision([word('Name',20,10),word('Student',300,10),word('Phone',360,10),word('Ria',20,40),word('9876543210',310,40)]));
 expect(result.students[0]).toMatchObject({name:'Ria',phone:null});
});
it('does not guess row associations from missing or rotated word geometry',()=>{
 const words=[...header,...row()].map(w=>({...w,boundingBox:{vertices:w.boundingBox.vertices.map(v=>({...v}))}}));words[0].boundingBox.vertices[1].y=90;
 const result=mapVisionResponse(vision(words));expect(result.students).toEqual([]);expect(result.rawLines.length).toBeGreaterThan(0);
});
it('limits imported rows and rejects malformed provider envelopes and oversized text',()=>{
 const result=mapVisionResponse(vision([...header,...Array.from({length:51},(_,i)=>row('Fictional Tara',40+i*25)).flat()]));
 expect(result.students).toHaveLength(50);expect(result.warnings.join(' ')).toMatch(/first 50/);
 for(const value of [null,{}, {responses:[null]}, {responses:[{error:{message:'private provider error'}}]}, {responses:[{fullTextAnnotation:{text:'x'.repeat(100001)}}]}])expect(()=>mapVisionResponse(value)).toThrow();
});

it('does not turn an unknown qualified name or its following contact into another student',()=>{
 const r=mapVisionResponse({responses:[{fullTextAnnotation:{text:'Student name: Fictional Tara\nAge: 9\nTeacher name: Fictional Coach\nPhone: 9999999999'}}]});
 expect(r.students).toHaveLength(1);expect(r.students[0]).toMatchObject({name:'Fictional Tara',age:9,phone:null});
});
it('keeps far-apart Guardian and Phone headers as separate columns',()=>{
 const r=mapVisionResponse(vision([word('Name',20,10),word('Guardian',300,10),word('Phone',600,10),word('Ria',20,40),word('Meera',300,40),word('9876543210',600,40)]));
 expect(r.students[0]).toMatchObject({name:'Ria',guardian:'Meera',phone:'9876543210'});
});
it('falls back instead of assigning people with stale columns after a changed section header',()=>{
 const words=[word('Student',20,10),word('Name',80,10),word('Guardian',300,10),word('Name',370,10),word('Phone',600,10),word('Tara',20,40),word('AdultA',300,40),word('123456',600,40),word('Guardian',20,70),word('Name',90,70),word('Student',300,70),word('Name',360,70),word('Phone',600,70),word('AdultB',20,100),word('Ria',300,100),word('678901',600,100)];
 const r=mapVisionResponse(vision(words));expect(r.students).toEqual([]);expect(r.warnings.join(' ')).toMatch(/Multiple table layouts/);
});
