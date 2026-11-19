import React, {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { prototypeColors as c } from './prototypeTheme';

const ModalFrame=createContext<ViewStyle>({});
// RN Modal portals preserve React context but leave the phone's DOM subtree.
// Constrain desktop overlays to its measured inner screen, as in the HTML.
export function usePrototypeModalStyle(){return useContext(ModalFrame);}

// The HTML references remove their presentation frame at <=530px. Keep the
// product full-bleed on phones and use those literal dimensions on desktop.
export function PrototypeFrame({variant,children}:{variant:'coach'|'parent';children:React.ReactNode}) {
  const {width,height}=useWindowDimensions();
  const desktop=Platform.OS==='web'&&width>530;
  const coach=variant==='coach';
  const phone=useRef<React.ComponentRef<typeof View>>(null);
  const [bounds,setBounds]=useState<ViewStyle>({});
  const measure=useCallback(()=>{
    if(!desktop)return;
    phone.current?.measureInWindow((left,top,w,h)=>setBounds(current=>
      current.left===left&&current.top===top&&current.width===w&&current.height===h?current:
        {position:'absolute',left,top,width:w,height:h,borderRadius:coach?42:43,overflow:'hidden'}));
  },[desktop,coach]);
  useEffect(()=>{
    measure();
    if(Platform.OS!=='web')return;
    window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
    return()=>{window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};
  },[measure,width,height]);
  return <ModalFrame.Provider value={desktop?bounds:{}}>{Platform.OS==='web'&&React.createElement('style',null,webRules)}<View testID="prototype-stage" nativeID={`prototype-${variant}-stage`} style={[s.stage,desktop&&s.desktop,desktop&&{minHeight:coach?938:956},desktop&&webStage]}>
    <View style={[s.frame,desktop&&{flexBasis:'auto',flexGrow:0,flexShrink:0,height:coach?882:900,width:coach?410:430,padding:coach?11:10,borderRadius:52},desktop&&webFrame]}>
      <View ref={phone} onLayout={measure} testID="prototype-phone" style={[s.phone,desktop&&{height:coach?860:880,flexBasis:'auto',flexGrow:0,flexShrink:0,borderRadius:coach?42:43}]}>{children}</View>
    </View>
  </View></ModalFrame.Provider>;
}
const webStage={backgroundColor:'#080c17',backgroundImage:'radial-gradient(900px 500px at 10% -9%,#28315782,transparent 70%),radial-gradient(600px 520px at 100% 0%,#183e5470,transparent 68%)'};
const webFrame={backgroundColor:'#0b121b',backgroundImage:'linear-gradient(145deg,#3a4656,#0b121b 40%,#283545 95%)',boxShadow:'0 30px 70px #000b,0 0 0 1px #34465a'};
// A CSS variable preserves the reference's EF alpha: RN Web's hex conversion
// otherwise rounds it to two decimals. Desktop overflow matches the HTML
// presentation instead of clipping its phone on shorter laptop viewports.
const webRules=`:root{--parentplus-coach-nav:#141417ef}
@media(min-width:531px){html,body{overflow:auto}#root{height:auto;min-height:100vh}}
 :is(button,input,textarea,select,[tabindex]):focus-visible{outline:2px solid #FFD23F;outline-offset:2px}
body:has(#prototype-parent-stage) :is(button,input,textarea,select,[tabindex]):focus-visible{outline-color:#3ABEFF;outline-offset:3px}`;
const s=StyleSheet.create({stage:{flex:1,backgroundColor:c.background},desktop:{paddingVertical:28,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},frame:{flex:1,width:'100%'},phone:{flex:1,width:'100%',backgroundColor:c.background,overflow:'hidden'}});
