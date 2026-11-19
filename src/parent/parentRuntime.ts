export type ParentBackendEnvironment='development'|'test'|'production';

const APVERSE_PROJECT_REF='fmavpazczahxeusqbxuh';

/** The test override cannot select a different Parent backend in development or production. */
export function usesApVerseParentRuntime(projectRef:string|undefined,environment:ParentBackendEnvironment,testOverride:string|null):boolean{
 return projectRef===APVERSE_PROJECT_REF||(environment==='test'&&testOverride==='apverse');
}
