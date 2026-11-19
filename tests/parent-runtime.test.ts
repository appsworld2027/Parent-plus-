import {expect,it} from 'vitest';
import {usesApVerseParentRuntime} from '../src/parent/parentRuntime';

const APVERSE='fmavpazczahxeusqbxuh';
const MM='zcgcnycnanqkbdlwojln';

it('routes the APVerse project to the APVerse Parent experience',()=>{
 expect(usesApVerseParentRuntime(APVERSE,'production',null)).toBe(true);
});

it('keeps the MM Parent experience as the default',()=>{
 expect(usesApVerseParentRuntime(MM,'production',null)).toBe(false);
});

it('allows the APVerse preview override only in test builds',()=>{
 expect(usesApVerseParentRuntime(MM,'test','apverse')).toBe(true);
 expect(usesApVerseParentRuntime(MM,'production','apverse')).toBe(false);
});
