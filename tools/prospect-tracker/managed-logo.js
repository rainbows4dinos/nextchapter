/** A managed reference contains only a public asset/site/role and a signature.
 * It never contains a prospect ID, company name, owner ID, credentials or authentication token.
 * The backend checks its exact issuer and owner-bound signature before fetching.
 * @param {unknown} value */
export function managedLogoUrl(value) {
  if(typeof value!=='string'||value.length>2048)return null;
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&/^\/functions\/v1\/job-ingest\/logo\/v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(url.pathname)?url.href:null;}catch{return null;}
}
