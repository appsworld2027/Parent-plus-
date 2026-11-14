import {expect,it} from 'vitest';
import {parseScan,validateReview,importPayload,type ReviewStudent} from '../src/onboarding/model';
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
