import { proficiencyLabels,validateStudent,type StudentDraft,type Roster,type Proficiency } from '../roster/model';
export type ScanStudent={name:string;age:string;guardian:string;email:string;phone:string;proficiency:Proficiency;warnings:string[]};
export type ReviewStudent=ScanStudent & {key:string;id:string;mode:'new'|'existing';selected:boolean};
export function parseScan(value:unknown):{students:ScanStudent[];warnings:string[]} {
  if(!value||typeof value!=='object')throw new Error('The scan response was unreadable. Try a clearer photo.');
  const data=value as Record<string,unknown>;
  if(!Array.isArray(data.students)||data.students.length>50)throw new Error('Scan up to 50 students per photo.');
  const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
  const warnings=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,5).map(x=>x.slice(0,200)):[];
  return {students:data.students.map((raw:unknown)=>{
    if(!raw||typeof raw!=='object')throw new Error('The scan response was unreadable.');
    const r=raw as Record<string,unknown>;
    const age=typeof r.age==='number'&&Number.isInteger(r.age)&&r.age>=0&&r.age<=120?String(r.age):typeof r.age==='string'&&/^\d{1,3}$/.test(r.age)&&Number(r.age)<=120?r.age:'';
    return {name:clean(r.name,100),age,guardian:clean(r.guardian,100),email:clean(r.email,320),phone:clean(r.phone,30),
      proficiency:typeof r.proficiency==='string'&&Object.hasOwn(proficiencyLabels,r.proficiency)?r.proficiency as Proficiency:'unassessed',warnings:warnings(r.warnings)};
  }),warnings:warnings(data.warnings)};
}
export const nameKey=(name:string)=>name.trim().replace(/\s+/g,' ').toLocaleLowerCase();
export function matches(row:ScanStudent,roster:Roster){return roster.students.filter(s=>nameKey(s.name)===nameKey(row.name));}
export function validateReview(rows:ReviewStudent[],roster:Roster):string|null {
  const chosen=rows.filter(r=>r.selected);if(!chosen.length)return 'Select at least one student.';
  const ids=new Set<string>(),names=new Set<string>();
  for(const row of chosen){
    if(ids.has(row.id))return 'The same student is selected twice. Keep one row.';ids.add(row.id);
    if(row.mode==='existing'){
      if(!roster.students.some(s=>s.id===row.id&&!s.archived_at))return 'Choose an active existing student.';
    }else{
      const invalid=validateStudent({...row,batches:[]} as StudentDraft);if(invalid)return invalid;
      const key=nameKey(row.name);if(names.has(key)||matches(row,roster).length)return 'A matching name exists. Choose the existing student, correct the name, or skip this row.';names.add(key);
    }
  }return null;
}
export function importPayload(rows:ReviewStudent[]){return rows.filter(r=>r.selected).map(r=>r.mode==='existing'?{id:r.id,mode:r.mode}:{id:r.id,mode:r.mode,name:r.name.trim(),age:r.age||null,guardian:r.guardian.trim(),email:r.email.trim(),phone:r.phone.trim(),proficiency:r.proficiency});}
