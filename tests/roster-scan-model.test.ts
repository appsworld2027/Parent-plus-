import {expect,it} from 'vitest';
import {parseScan,validateReview,importPayload,namesFromLines,needsManualNameSelection,type ReviewStudent} from '../src/onboarding/model';
import type {Roster} from '../src/roster/model';
const roster:Roster={students:[{id:'existing',name:'Ria  Shah',age_years:8,archived_at:null}],batches:[],contacts:[],enrolments:[]};
const row:ReviewStudent={key:'one',id:'new',name:'Tara',age:'9',guardian:'',email:'',phone:'',proficiency:'unassessed',warnings:[],mode:'new',selected:true};
it('keeps multilingual names and blanks unsupported ages/levels without inventing data',()=>{
 const result=parseScan({students:[{name:'  रिया शाह  ',age:9.5,proficiency:'genius',phone:null}],warnings:['Unclear age']});
 expect(result.students[0]).toMatchObject({name:'रिया शाह',age:'',proficiency:'unassessed',guardian:'',phone:''});
 expect(result.warnings).toEqual(['Unclear age']);
 expect(()=>parseScan({students:Array(51).fill({})})).toThrow();
});
it('requires a valid reviewed selection and resolves existing names explicitly',()=>{
 expect(validateReview([{...row,selected:false}],roster)).toMatch(/Select/);
 expect(validateReview([{...row,name:' ria shah '}],roster)).toMatch(/matching name/);
 expect(validateReview([row,{...row,key:'two',id:'two'}],roster)).toMatch(/matching name/);
 expect(validateReview([{...row,mode:'existing',id:'existing'}],roster)).toBeNull();
 expect(validateReview([{...row,mode:'existing',id:'foreign'}],roster)).toMatch(/existing/);
 expect(validateReview([{...row,email:'bad'}],roster)).toMatch(/guardian/);
});
it('sends only reviewed selected fields; linking cannot overwrite a profile',()=>{
 expect(importPayload([{...row,mode:'existing',id:'existing'}, {...row,selected:false}])).toEqual([{id:'existing',mode:'existing'}]);
 expect(importPayload([row])[0]).not.toHaveProperty('warnings');
 expect(importPayload([row])[0]).not.toHaveProperty('key');
});

it('keeps bounded recognised text available for review without storing it in imports',()=>{
 const result=parseScan({students:[],warnings:[],rawLines:['Name','Fictional Meera',null,'x'.repeat(600)]});
 expect(result.rawLines).toHaveLength(3);expect(result.rawLines[2]).toHaveLength(500);
 expect(importPayload([row])[0]).not.toHaveProperty('rawLines');
});
it('names-only mode strips numbering, leaves details blank and rejects contact/age lines',()=>{
 const result=namesFromLines(['Name','Teacher name','Parent name','1. Fictional Meera','२) रिया शाह','Age: 9','9876543210','meera@example.test']);
 expect(result.map(r=>r.name)).toEqual(['Fictional Meera','रिया शाह']);
 expect(result[0]).toMatchObject({age:'',guardian:'',email:'',phone:'',proficiency:'unassessed'});
});

it('requires name selection when unassigned contact or age columns are present',()=>{
 expect(needsManualNameSelection(['1. Fictional Meera','२) रिया शाह'])).toBe(false);
 expect(needsManualNameSelection(['Fictional Ria','8','Fictional Meera','9876543210'])).toBe(true);
 expect(needsManualNameSelection(['Name Age Parent Phone','Fictional Ria','8','Meera','9876543210'])).toBe(true);
 expect(namesFromLines(['Name Age Parent Phone','Fictional Ria']).map(r=>r.name)).toEqual(['Fictional Ria']);
});
