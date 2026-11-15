// Deterministic OCR-to-field mapping. Never infer missing profile details.
export type VisionStudent={name:string;age:number|null;guardian:string|null;email:string|null;phone:string|null;proficiency:string;warnings:string[]};
export type VisionResult={students:VisionStudent[];warnings:string[];rawLines:string[]};
type Field='name'|'age'|'guardian'|'email'|'phone'|'proficiency'|'ignore';
type Word={text:string;left:number;right:number;top:number;bottom:number;confidence?:number};
type Line={words:Word[];text:string;top:number;bottom:number};
type Header={field:Field;left:number;right:number};
const aliases:Record<Field,string[]>={
  name:['student full name','student name','full name','name of student','child name','child s name','छात्र का नाम','छात्रा का नाम','विद्यार्थी का नाम','विद्यार्थी नाम','बच्चे का नाम','नाम','name'],
  age:['age years','age in years','age','आयु','उम्र'],
  guardian:['parent guardian name','parent name','guardian name','father s name','father name','mother s name','mother name','अभिभावक का नाम','पिता का नाम','माता का नाम','अभिभावक','guardian','parent'],
  phone:['guardian phone','parent phone','guardian mobile','parent mobile','contact number','contact no','mobile number','mobile no','phone number','phone no','मोबाइल नंबर','फोन नंबर','संपर्क नंबर','मोबाइल','फोन','mobile','phone','contact'],
  email:['guardian email','parent email','email address','email','ईमेल'],
  proficiency:['proficiency level','learning level','proficiency','level','स्तर'],
  ignore:['student phone','student mobile','student email','roll number','roll no','serial number','s no','date of birth','dob','school','batch name','batch','section','gender','class','grade','address','fee','fees','क्रमांक','कक्षा','जन्मतिथि','पता']
};
const normal=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu,' ').trim().replace(/\s+/g,' ');
const labels=Object.entries(aliases).flatMap(([field,values])=>values.map(label=>({field:field as Field,label:normal(label)}))).sort((a,b)=>b.label.length-a.label.length);
const digits=(s:string)=>s.replace(/[०-९]/g,c=>String(c.charCodeAt(0)-0x966));
function matchLabel(text:string):Field|undefined{return labels.find(l=>l.label===normal(text))?.field;}
function profile(cells:Partial<Record<Field,string>>,warnings:string[]=[]):VisionStudent{
  const trim=(key:Field,max:number)=>{const v=(cells[key]??'').trim();if(v.length>max)warnings.push(`${key} was shortened; check the source text.`);return v.slice(0,max);};
  const ageText=digits(trim('age',60)).replace(/\s*(years?|yrs?|वर्ष|साल)\s*$/iu,'').trim();
  const age=/^\d{1,3}$/.test(ageText)&&Number(ageText)<=120?Number(ageText):null;
  if(ageText&&age===null)warnings.push('Age is unclear; enter it manually.');
  const level=normal(trim('proficiency',100));
  const levels:Record<string,string>={'new':'new','new learner':'new','नया':'new','beginner':'beginner','प्रारंभिक':'beginner','intermediate':'intermediate','मध्यम':'intermediate','advanced':'advanced','उन्नत':'advanced','unassessed':'unassessed','not assessed':'unassessed'};
  if(level&&!levels[level])warnings.push('Learning level needs confirmation.');
  const email=trim('email',320),phone=digits(trim('phone',60));
  const validEmail=!email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),validPhone=!phone||(/^[+\d() .-]+$/.test(phone)&&phone.replace(/\D/g,'').length>=5&&phone.length<=30);
  if(!validEmail)warnings.push('Email is unclear; enter it manually.');
  if(!validPhone)warnings.push('Phone is unclear; enter it manually.');
  if(email||phone)warnings.push('Confirm these contact details belong to the guardian.');
  const name=trim('name',100).replace(/^\d+[.)-]?\s+(?=\p{L})/u,'');
  if(!name)warnings.push('Student name is missing; this row is not selected automatically.');
  return {name,age,guardian:trim('guardian',100)||null,email:validEmail?email||null:null,phone:validPhone?phone||null:null,proficiency:levels[level]??'unassessed',warnings:[...new Set(warnings)].slice(0,8)};
}
function textLines(text:string){return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,200).map(s=>s.slice(0,500));}
function formRows(raw:string[]):VisionStudent[]{
  const rows:VisionStudent[]=[];let cells:Partial<Record<Field,string>>={};let blocked=false;
  const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const choices=labels.map(item=>item.label.split(' ').map(escape).join("[\\s’'/-]+"));
  const pattern=new RegExp(`(?<![\\p{L}\\p{M}])(${choices.join('|')})\\s*[:：=]\\s*`,'giu');
  const flush=()=>{if(cells.name){rows.push(profile(cells));}cells={};};
  for(const line of raw){
    const pairs=[...line.matchAll(pattern)];
    const first=pairs[0],prefix=first?line.slice(0,first.index).trim():line;
    // Never match the suffix of an unknown qualified label (e.g. Teacher name).
    // An unknown labelled section ends the current student's contact scope.
    if(!first||prefix){if(/[:：=]/u.test(line)){flush();blocked=true;}continue;}
    const firstField=matchLabel(first[1]);
    const explicitStudent=firstField==='name'&&/student|child|छात्र|विद्यार्थी|बच्चे/iu.test(first[1]);
    if(blocked&&!explicitStudent)continue;
    if(explicitStudent)blocked=false;
    // Generic Name is accepted at line start, never as a suffix later in a line.
    if(pairs.some((pair,i)=>i>0&&normal(pair[1])==='name')||pairs.length!==(line.match(/[:：=]/gu)?.length??0)){
      flush();blocked=true;continue;
    }
    for(let i=0;i<pairs.length;i++){
      const field=matchLabel(pairs[i][1]);if(!field||field==='ignore')continue;
      const value=line.slice(pairs[i].index!+pairs[i][0].length,pairs[i+1]?.index??line.length).trim();
      if(field==='name'&&cells.name)flush();
      cells[field]=value;
    }
  }
  flush();return rows;
}
function readWord(raw:unknown):Word|null{
  if(!raw||typeof raw!=='object')return null;const r=raw as Record<string,unknown>;
  if(!Array.isArray(r.symbols)||r.symbols.length>200)return null;
  const text=r.symbols.map((s:unknown)=>s&&typeof s==='object'&&typeof(s as {text?:unknown}).text==='string'?(s as {text:string}).text:'').join('').trim();
  const box=r.boundingBox as {vertices?:{x?:number;y?:number}[]}|undefined,v=box?.vertices;
  if(!text||text.length>200||!Array.isArray(v)||v.length!==4)return null;
  const points=v.map(p=>({x:p.x??0,y:p.y??0}));if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0))return null;
  const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
  if(right<=left||bottom<=top)return null;
  // Rotated/steep text needs review as raw text rather than guessed table rows.
  if(Math.abs(points[1].y-points[0].y)>Math.max(4,Math.abs(points[1].x-points[0].x)*0.27))return null;
  return {text,left,right,top,bottom,confidence:typeof r.confidence==='number'?r.confidence:undefined};
}
function linesFromWords(words:Word[]):Line[]{
  const lines:Line[]=[];
  for(const word of words.sort((a,b)=>(a.top+a.bottom)-(b.top+b.bottom)||a.left-b.left)){
    const center=(word.top+word.bottom)/2,height=word.bottom-word.top;
    const line=lines.slice(-3).find(l=>Math.abs(center-(l.top+l.bottom)/2)<=Math.max(height,l.bottom-l.top)*0.45);
    if(line){line.words.push(word);line.top=Math.min(line.top,word.top);line.bottom=Math.max(line.bottom,word.bottom);}
    else lines.push({words:[word],text:'',top:word.top,bottom:word.bottom});
  }
  return lines.sort((a,b)=>a.top-b.top).map(l=>({...l,words:l.words.sort((a,b)=>a.left-b.left),text:l.words.map(w=>w.text).join(' ')}));
}
function headers(line:Line):Header[]{
  const found:Header[]=[];
  for(let i=0;i<line.words.length;){
    let hit:Header|undefined,end=i;
    for(let length=Math.min(5,line.words.length-i);length>=1;length--){
      const words=line.words.slice(i,i+length);
      if(words.some((word,index)=>index>0&&word.left-words[index-1].right>Math.max(12,Math.min(word.bottom-word.top,words[index-1].bottom-words[index-1].top)*2)))continue;
      const field=matchLabel(words.map(w=>w.text).join(' '));
      if(field){hit={field,left:words[0].left,right:words.at(-1)!.right};end=i+length;break;}
    }
    if(hit){found.push(hit);i=end;}else i++;
  }return found;
}
export function mapVisionResponse(value:unknown):VisionResult{
  if(!value||typeof value!=='object')throw new Error('Invalid OCR response');
  const responses=(value as {responses?:unknown}).responses;
  if(!Array.isArray(responses)||responses.length!==1||!responses[0]||typeof responses[0]!=='object')throw new Error('Invalid OCR response');
  const response=responses[0] as Record<string,unknown>;if(response.error)throw new Error('OCR provider error');
  const annotation=response.fullTextAnnotation as {text?:unknown;pages?:unknown[]}|undefined;
  const old=Array.isArray(response.textAnnotations)?response.textAnnotations[0] as {description?:unknown}|undefined:undefined;
  const raw=typeof annotation?.text==='string'?annotation.text:typeof old?.description==='string'?old.description:'';
  if(raw.length>100000)throw new Error('OCR response too large');
  let rawLines=textLines(raw);const warnings=['Review every name and its associated contact details. OCR can miss rows or misread handwriting.'];
  if(raw.split(/\r?\n/).length>200)warnings.push('Only the first 200 text lines are shown. Scan a smaller section.');
  const forms=formRows(rawLines);if(forms.length)return {students:forms.slice(0,50),warnings:forms.length>50?[...warnings,'Only the first 50 students are shown. Scan the remaining section separately.']:warnings,rawLines};
  const pages=annotation?.pages;
  if(Array.isArray(pages)&&pages.length===1){
    const page=pages[0] as {blocks?:{paragraphs?:{words?:unknown[]}[]}[]};const all:unknown[]=[];
    for(const block of page?.blocks??[])for(const paragraph of block.paragraphs??[])for(const word of paragraph.words??[]){if(all.length>=3000)throw new Error('OCR page too large');all.push(word);}
    const words=all.map(readWord).filter((w):w is Word=>!!w),lines=linesFromWords(words);
    if(!rawLines.length)rawLines=lines.map(l=>l.text).slice(0,200);
    // If some geometry is missing/rotated, don't guess row associations.
    if(words.length===all.length&&words.length){
      for(let i=0;i<Math.min(lines.length,15);i++){
        const columns=headers(lines[i]);
        if(!columns.some(c=>c.field==='name')||columns.filter(c=>c.field!=='ignore').length<1)continue;
        if(new Set(columns.filter(c=>c.field!=='ignore').map(c=>c.field)).size!==columns.filter(c=>c.field!=='ignore').length)continue;
        const headerWords=lines[i].words.filter(w=>columns.some(c=>w.left>=c.left&&w.right<=c.right));
        // A header mixed with actual cell values is not a reliable table header.
        if(lines[i].words.some(word=>!headerWords.includes(word)&&!/^([0-9०-९]+[.)]?|[|:=—-]+)$/.test(word.text)))continue;
        if(columns.some(c=>c.field==='ignore'))warnings.push('Unsupported register columns were not copied into student fields.');
        const students:VisionStudent[]=[];
        for(const line of lines.slice(i+1)){
          const repeated=headers(line);
          if(repeated.some(c=>c.field==='name')){
            if(repeated.length!==columns.length||repeated.some((column,index)=>column.field!==columns[index].field||Math.abs(column.left-columns[index].left)>Math.max(12,line.bottom-line.top))){
              return {students:[],warnings:[...warnings,'Multiple table layouts were detected. Fields were not assigned across sections; review the recognised text.'],rawLines};
            }
            if(!warnings.includes('A repeated header was skipped. Check for multiple table sections.'))warnings.push('A repeated header was skipped. Check for multiple table sections.');continue;
          }
          const cells:Partial<Record<Field,string>>={};
          for(const word of line.words){
            let column=0;
            for(let c=1;c<columns.length;c++){const boundary=columns[c].left-Math.max(6,(columns[c].left-columns[c-1].left)*0.1);if((word.left+word.right)/2>=boundary)column=c;}
            const field=columns[column].field;if(field!=='ignore')cells[field]=[cells[field],word.text].filter(Boolean).join(' ');
          }
          if(!Object.values(cells).some(Boolean))continue;
          if(cells.name&&/^((total|subtotal)(\s|$)|कुल(\s|$))/iu.test(cells.name))continue;
          if(cells.name&&!/\p{L}/u.test(cells.name))continue;
          const rowWarnings=line.words.some(w=>w.confidence!==undefined&&w.confidence<0.8)?['Some text has low recognition confidence.']:[];
          students.push(profile(cells,rowWarnings));
        }
        if(students.length){if(students.length>50)warnings.push('Only the first 50 rows are shown. Scan the remaining section separately.');return {students:students.slice(0,50),warnings,rawLines};}
      }
    }
  }
  return {students:[],warnings:[...warnings,'Column labels were not clear enough to fill fields safely. Review the recognised text or use the names-only option.'],rawLines};
}
