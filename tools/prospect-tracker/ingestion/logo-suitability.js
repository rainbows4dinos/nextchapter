/** Deterministic review signals, not semantic image classification or scores.
 * Bounds are normalized to [0,1], so callers can analyze a bounded-size decode.
 * White is the Company's loaded-avatar backing in both themes.
 * @param {Uint8ClampedArray|Uint8Array} rgba @param {number} width @param {number} height */
export function artworkBounds(rgba, width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 8_000_000 || rgba.length !== width * height * 4) throw new Error('Invalid decoded logo pixels');
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const index=(y*width+x)*4,alpha=rgba[index+3]/255;
    // Composite against the actual white backing before measuring contrast.
    const darkest=Math.min(rgba[index],rgba[index+1],rgba[index+2])*alpha+255*(1-alpha);
    if(darkest>=245)continue;
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
  return right<0?null:{left:left/width,top:top/height,right:(right+1)/width,bottom:(bottom+1)/height};
}

/** @typedef {'ats-logo'|'organization-logo'|'touch-icon'|'manifest-icon'|'favicon'|'standalone-mark'} LogoRole */
/** @typedef {{url:string,source:'ats'|'website',role:LogoRole,employerMatched:boolean,context?:'branding'|'marketing'|'social'|'ats-platform',width:number,height:number,bounds?:{left:number,top:number,right:number,bottom:number}|null}} LogoCandidate */
/** @param {LogoCandidate} candidate */
export function assessLogo(candidate) {
  /** @type {string[]} */ const flags=[];
  if(!candidate.employerMatched)return {accepted:false,flags:['unverified-employer']};
  if(candidate.context && candidate.context!=='branding')return {accepted:false,flags:[`rejected-${candidate.context}`]};
  const {width,height}=candidate;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>4096||height>4096||width*height>8_000_000)return {accepted:false,flags:['invalid-dimensions']};
  if(Math.max(width,height)<16)return {accepted:false,flags:['insufficient-image-content']};
  if(candidate.bounds===null)return {accepted:false,flags:['no-visible-artwork-on-white']};
  const bounds=candidate.bounds??{left:0,top:0,right:1,bottom:1};
  if(!Object.values(bounds).every(value=>Number.isFinite(value)&&value>=0&&value<=1)||bounds.right<=bounds.left||bounds.bottom<=bounds.top)return {accepted:false,flags:['invalid-artwork-bounds']};
  const inkWidth=width*(bounds.right-bounds.left),inkHeight=height*(bounds.bottom-bounds.top);
  if(width/height>3||inkWidth/inkHeight>3)flags.push('wide-artwork');
  if(28*inkHeight/Math.max(width,height)<8)flags.push('small-artwork-at-28px');
  if((bounds.right-bounds.left)*(bounds.bottom-bounds.top)<0.15)flags.push('excessive-padding');
  if(Math.min(width,height)<112)flags.push('limited-resolution-for-2x-details');
  return {accepted:true,flags};
}

/** Compare only employer-bound, successfully decoded candidates. Geometry is
 * a flag, never an automatic rejection of wordmarks or intentional whitespace.
 * Retain an unflagged ATS candidate rather than assuming every site icon wins.
 * @param {LogoCandidate[]} candidates */
export function selectLogo(candidates) {
  const reviewed=candidates.map(candidate=>({candidate,...assessLogo(candidate)}));
  const accepted=reviewed.filter(item=>item.accepted);
  if(!accepted.length)return {selected:null,reason:'initials-no-acceptable-candidate',reviewed};
  const significant=/** @param {string[]} flags */ flags=>flags.some(flag=>['wide-artwork','small-artwork-at-28px','excessive-padding'].includes(flag));
  const ats=accepted.find(item=>item.candidate.source==='ats');
  if(ats&&!significant(ats.flags))return {selected:ats.candidate,reason:'retain-acceptable-ats-branding',reviewed};
  const roles=['standalone-mark','touch-icon','manifest-icon','favicon','organization-logo','ats-logo'];
  const icons=accepted.filter(item=>['standalone-mark','touch-icon','manifest-icon','favicon'].includes(item.candidate.role)&&!significant(item.flags));
  icons.sort((a,b)=>Number(a.flags.includes('limited-resolution-for-2x-details'))-Number(b.flags.includes('limited-resolution-for-2x-details'))||roles.indexOf(a.candidate.role)-roles.indexOf(b.candidate.role)||Math.min(b.candidate.width,b.candidate.height)-Math.min(a.candidate.width,a.candidate.height));
  if(icons[0])return {selected:icons[0].candidate,reason:'prefer-declared-icon-over-flagged-branding',reviewed};
  return {selected:(ats??accepted[0]).candidate,reason:'retain-trustworthy-branding-with-quality-flags',reviewed};
}
