// One-tab, account-scoped navigation intent, not an authentication credential.
// Invitations stay out of URLs/referrers and are removed after a successful claim.
export type FeedbackJourney = {
  owner:string;academy:string;student:string;name:string;handoff:string;
  code?:string;child?:string;expires:number;
};
const key='parentplus.feedback-journey.v1';
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function saveFeedbackJourney(storage:Store,value:FeedbackJourney) {
  storage.setItem(key,JSON.stringify(value));
}
export function readFeedbackJourney(storage:Store,owner:string,now=Date.now()):FeedbackJourney|null {
  try {
    const raw=storage.getItem(key);if(!raw)return null;
    const value=JSON.parse(raw);
    if(!value||typeof value!=='object'||value.owner!==owner||!Number.isFinite(value.expires)||value.expires<=now||value.expires>now+49*60*60*1000||
      !['owner','academy','student','name','handoff'].every(field=>typeof value[field]==='string'&&value[field].length>0&&value[field].length<=100)||
      (value.code!==undefined&&!/^[0-9a-f]{64}$/.test(value.code))||
      (value.child!==undefined&&(typeof value.child!=='string'||!value.child||value.child.length>100))||(!value.code&&!value.child)) {
      storage.removeItem(key);return null;
    }
    return value;
  } catch {try{storage.removeItem(key);}catch{}return null;}
}
export function clearFeedbackJourney(storage:Store){storage.removeItem(key);}
