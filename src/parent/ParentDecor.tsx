import React, {useId} from 'react';
import {ImageBackground, Platform, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {Circle, Defs, G, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {Text} from '../ui/Typography';
import {prototypeColors as c, prototypeWeight} from '../ui/prototypeTheme';

// Literal final Aurora CSS cascade. Keeping these layers responsive preserves
// the 37/43px and 68/59px star grids instead of scaling/cropping a raster on web.
// Use the source's static reduced-motion phase; no animation is required.
const auroraBase={backgroundColor:'transparent',color:'#f7fbff',isolation:'isolate' as const,backgroundImage:'linear-gradient(175deg,#0d2030,#0d2030 50%,#0c1722 120%)'};
const auroraBefore:React.CSSProperties={position:'absolute',boxSizing:'border-box',pointerEvents:'none',zIndex:-2,left:'8%',right:'-25%',top:-100,height:270,background:'radial-gradient(ellipse 53% 36% at 50% 42%,#54d9cd 0%,transparent 95%),radial-gradient(ellipse 58% 40% at 73% 60%,#8585ff 0%,transparent 85%),radial-gradient(ellipse 53% 56% at 7% 73%,#80baf5 0%,transparent 85%)',filter:'blur(26px)',opacity:.75,transform:'rotate(-13deg)'};
const auroraCurve:React.CSSProperties={position:'absolute',boxSizing:'border-box',pointerEvents:'none',width:'135%',height:95,top:5,left:'-9%',borderRadius:'50%',transform:'rotate(-14deg)',zIndex:-1,borderTop:'23px solid #54d9cd',filter:'blur(20px)',opacity:.33};
const auroraAfter:React.CSSProperties={position:'absolute',boxSizing:'border-box',pointerEvents:'none',zIndex:-1,inset:0,background:'radial-gradient(circle at 20% 28%,#e3ffff 0 .75px,transparent 1.35px) 0 0/37px 43px,radial-gradient(circle at 50% 50%,#e8fdff 0 .85px,transparent 1.4px) 0 0/68px 59px,linear-gradient(0deg,#0c1722 0%,transparent 60%)',opacity:.55};
export function ParentAuroraBackground({children,style}:{children:React.ReactNode;style?:StyleProp<ViewStyle>}) {
  if(Platform.OS!=='web')return <ImageBackground source={require('../../assets/parent/aurora-header.png')} resizeMode="cover" style={style}>{children}</ImageBackground>;
  return <View testID="parent-aurora" style={[style,s.aurora,auroraBase]}>
    {React.createElement('div',{'aria-hidden':true,style:auroraBefore})}
    {React.createElement('i',{'aria-hidden':true,style:auroraCurve})}
    {React.createElement('div',{'aria-hidden':true,style:auroraAfter})}
    {children}
  </View>;
}

// Decorative layers reproduce the prototype's CSS gradients without adding
// camera/voice permissions, actions, account badges, or sample profile images.
export function ParentAvatar({letter}:{letter:string}) {
  const id=`avatar${useId().replace(/\W/g,'')}`;
  return <View style={s.avatar}><Svg width={42} height={42} viewBox="-2 -2 42 42" style={s.avatarArt} accessible={false}><Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={c.sky}/><Stop offset="1" stopColor={c.grape}/></LinearGradient></Defs><Circle cx={19} cy={19} r={19} fill={`url(#${id})`}/><Circle cx={19} cy={19} r={20} fill="none" stroke="#ffffff55" strokeWidth={2}/></Svg><Text style={s.letter}>{letter}</Text></View>;
}

export function ParentCaptureRing() {
  const id=`capture${useId().replace(/\W/g,'')}`;
  const colors=[c.sky,c.mint,c.sun,c.rose,c.grape,c.sky];
  const point=(index:number)=>({x:40+32*Math.cos((-90+72*index)*Math.PI/180),y:40+32*Math.sin((-90+72*index)*Math.PI/180)});
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.capture}>
    <Svg width={80} height={80} style={StyleSheet.absoluteFill} accessible={false}>
      <Defs>{colors.slice(0,5).map((color,index)=>{const a=point(index),b=point(index+1);return <LinearGradient key={index} id={`${id}${index}`} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}><Stop offset="0" stopColor={color}/><Stop offset="1" stopColor={colors[index+1]}/></LinearGradient>;})}</Defs>
      {colors.slice(0,5).map((_,index)=>{const a=point(index),b=point(index+1);return <Path key={`glow${index}`} d={`M ${a.x} ${a.y} A 32 32 0 0 1 ${b.x} ${b.y}`} fill="none" stroke={`url(#${id}${index})`} strokeWidth={14} opacity={.13}/>;})}
      {colors.slice(0,5).map((_,index)=>{const a=point(index),b=point(index+1);return <Path key={index} d={`M ${a.x} ${a.y} A 32 32 0 0 1 ${b.x} ${b.y}`} fill="none" stroke={`url(#${id}${index})`} strokeWidth={6}/>;})}
      <Circle cx={40} cy={40} r={29} fill={c.white}/>
      {/* Draw after the white core in the same SVG: positioned backdrop SVGs can cover sibling glyphs on web. */}
      <G transform="translate(27 27) scale(1.0833333)"><Path d="M12 5v14M5 12h14" fill="none" stroke={c.black} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"/></G>
    </Svg>
  </View>;
}

// Use the already-installed SVG renderer for the native fade. Native keeps the
// translucent surface; only web has the prototype's backdrop-filter blur.
export function ParentNavFade() {
  const id=`navfade${useId().replace(/\W/g,'')}`;
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}><Svg width="100%" height="100%" accessible={false}><Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c.background} stopOpacity={0}/><Stop offset=".3" stopColor={c.background} stopOpacity={1}/><Stop offset="1" stopColor={c.background} stopOpacity={1}/></LinearGradient></Defs><Rect width="100%" height="100%" fill={`url(#${id})`}/></Svg></View>;
}

const s=StyleSheet.create({aurora:{position:'relative',overflow:'hidden'},avatarArt:{position:'absolute',left:-2,top:-2,overflow:'visible'},avatar:{height:38,width:38,alignItems:'center',justifyContent:'center'},letter:{fontSize:15,fontWeight:prototypeWeight(850),color:c.white},capture:{height:80,width:80,alignItems:'center',justifyContent:'center'}});
