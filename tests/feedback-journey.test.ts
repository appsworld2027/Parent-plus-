import {expect,it} from 'vitest';
import {readFeedbackJourney,saveFeedbackJourney,clearFeedbackJourney,type FeedbackJourney} from '../src/parent/feedbackJourney';
const now=Date.now(),intent:FeedbackJourney={owner:'owner',academy:'academy',student:'student',name:'Child',handoff:'snapshot',code:'a'.repeat(64),expires:now+10000};
function store(){const data=new Map<string,string>();return {getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};}
it('restores a pending child connection only for the same signed-in account',()=>{
 const storage=store();saveFeedbackJourney(storage,intent);expect(readFeedbackJourney(storage,'owner',now)).toEqual(intent);
 expect(readFeedbackJourney(storage,'different-owner',now)).toBeNull();expect(readFeedbackJourney(storage,'owner',now)).toBeNull();
});
it('expires invitations and rejects malformed intents rather than inferring a child',()=>{
 const storage=store();saveFeedbackJourney(storage,intent);expect(readFeedbackJourney(storage,'owner',now+10001)).toBeNull();
 saveFeedbackJourney(storage,{...intent,code:'incomplete'});expect(readFeedbackJourney(storage,'owner',now)).toBeNull();
 saveFeedbackJourney(storage,{...intent,code:undefined});expect(readFeedbackJourney(storage,'owner',now)).toBeNull();
});
it('supports an existing connection and explicitly clears its navigation intent',()=>{
 const storage=store();const connected={...intent,code:undefined,child:'existing-child'};saveFeedbackJourney(storage,connected);
 expect(readFeedbackJourney(storage,'owner',now)?.child).toBe('existing-child');clearFeedbackJourney(storage);expect(readFeedbackJourney(storage,'owner',now)).toBeNull();
});
