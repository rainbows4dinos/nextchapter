import assert from 'node:assert/strict';
import { imageBody, publicIpv4, retrieveLogo } from './logo-transport.ts';
const logo = 'https://workablehr.s3.amazonaws.com/uploads/account/logo/514327/logo';
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOGkAAAAASUVORK5CYII='), c => c.charCodeAt(0));
const encode = (value:string) => new TextEncoder().encode(value);
const concat = (...parts:Uint8Array[]) => { const result = new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0)); let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result; };
Deno.test('private, reserved, mapped and non-IPv4 DNS destinations fail closed',()=>{
  for(const ip of ['0.0.0.0','10.0.0.1','127.0.0.1','169.254.169.254','172.16.0.1','172.31.255.255','192.168.1.1','192.0.2.1','198.18.0.1','198.51.100.1','203.0.113.1','100.64.0.1','224.0.0.1','255.255.255.255','::1','::ffff:127.0.0.1','8.8.8.999','008.008.008.008','localhost'])assert.equal(publicIpv4(ip),false,ip);
  assert.equal(publicIpv4('8.8.8.8'),true);
});
Deno.test('HTTP framing accepts bounded length/chunked raster bytes, rejects redirects and ambiguous framing',()=>{
  const plain=concat(encode(`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${png.length}\r\n\r\n`),png);
  assert.deepEqual(imageBody(plain),png);
  assert.deepEqual(imageBody(concat(encode(`HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n${png.length.toString(16)}\r\n`),png,encode('\r\n0\r\n\r\n'))),png);
  for(const headers of ['HTTP/1.1 302 Found\r\nLocation: http://127.0.0.1/','HTTP/1.1 200 OK\r\nContent-Length: 2','HTTP/1.1 200 OK\r\nContent-Encoding: gzip','HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 1','HTTP/1.1 200 OK\r\nContent-Length: 1\r\nContent-Length: 1'])assert.throws(()=>imageBody(concat(encode(headers+'\r\n\r\n'),png)));
  assert.throws(()=>imageBody(encode('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n1\r\nx\r\n0\r\nX-Trailer: bad\r\n\r\n')));
});
Deno.test('pins the first checked IP without re-resolution and verifies TLS with the original hostname',async()=>{
  let resolves=0,connected='',secured='',request='',closed=0,read=false;
  const wire=concat(encode(`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${png.length}\r\n\r\n`),png);
  const tcp={close(){closed++;}} as Deno.TcpConn;
  const tls={close(){closed++;},handshake(){return Promise.resolve({alpnProtocol:'http/1.1'});},write(bytes:Uint8Array){request+=new TextDecoder().decode(bytes);return Promise.resolve(bytes.length);},read(bytes:Uint8Array){if(read)return Promise.resolve(null);read=true;bytes.set(wire);return Promise.resolve(wire.length);}} as Deno.TlsConn;
  const result=await retrieveLogo(logo,new AbortController().signal,{
    resolve:()=>{resolves++;return Promise.resolve(['8.8.8.8']);},
    connect:(ip)=>{connected=ip;return Promise.resolve(tcp);},
    secure:(_,host)=>{secured=host;return Promise.resolve(tls);}
  });
  assert.equal(resolves,1);assert.equal(connected,'8.8.8.8');assert.equal(secured,'workablehr.s3.amazonaws.com');assert.equal(closed,1);
  assert.deepEqual(result.bytes,png);assert.equal(result.type,'image/png');
  assert.match(request,/Host: workablehr.s3.amazonaws.com/);assert.doesNotMatch(request,/Authorization|Cookie|Referer/i);
});
Deno.test('unsupported routes and nonpublic DNS never connect; TLS failure never falls back',async()=>{
  let connections=0;
  const dependencies={resolve:()=>Promise.resolve(['127.0.0.1']),connect:()=>{connections++;throw Error('unexpected');},secure:()=>{throw Error('unexpected');}};
  await assert.rejects(retrieveLogo('https://evil.org/a.png',new AbortController().signal,dependencies));
  await assert.rejects(retrieveLogo(logo,new AbortController().signal,dependencies));assert.equal(connections,0);
  let closed=false;
  await assert.rejects(retrieveLogo(logo,new AbortController().signal,{resolve:()=>Promise.resolve(['8.8.8.8']),connect:()=>Promise.resolve({close(){closed=true;}} as Deno.TcpConn),secure:()=>{throw Error('certificate mismatch');}}));
  assert.equal(closed,true);
});
Deno.test('cancellation stops DNS/connect work and closes late sockets',async()=>{
  const controller=new AbortController();let finish!:(value:Deno.TcpConn)=>void,closed=false;
  const result=retrieveLogo(logo,controller.signal,{resolve:()=>Promise.resolve(['8.8.8.8']),connect:()=>new Promise(resolve=>{finish=resolve;}),secure:()=>{throw Error('unexpected');}});
  await new Promise(resolve=>setTimeout(resolve,0));controller.abort();await assert.rejects(result);
  finish({close(){closed=true;}} as Deno.TcpConn);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(closed,true);
});

Deno.test('wire, header and decoded image limits reject oversized responses',()=>{
  assert.throws(()=>imageBody(new Uint8Array(2*1024*1024+64*1024+1)));
  assert.throws(()=>imageBody(encode('HTTP/1.1 200 OK\r\nX-Large: '+ 'a'.repeat(17000)+'\r\n\r\n')));
  assert.throws(()=>imageBody(concat(encode('HTTP/1.1 200 OK\r\n\r\n'),new Uint8Array(2*1024*1024+1))));
});

Deno.test('verified-site transport rejects DNS rebinding answers and redirects without weaker fallback',async()=>{
  const {pinnedResource}=await import('./logo-transport.ts');let connected=false;
  for(const answers of [['127.0.0.1'],['8.8.8.8','169.254.169.254'],[]])await assert.rejects(pinnedResource('https://verified.example.com/icon.png',new AbortController().signal,{accept:'image/png',byteLimit:1024},{resolve:()=>Promise.resolve(answers),connect:()=>{connected=true;throw Error();},secure:()=>{throw Error();}}));
  assert.equal(connected,false);
  let closed=false;
  const wire=new TextEncoder().encode('HTTP/1.1 302 Found\r\nLocation: https://127.0.0.1/private\r\nContent-Length: 0\r\n\r\n');let read=false;
  const tls={handshake:()=>Promise.resolve({alpnProtocol:'http/1.1'}),close(){closed=true;},write:(bytes:Uint8Array)=>Promise.resolve(bytes.length),read:(bytes:Uint8Array)=>{if(read)return Promise.resolve(null);read=true;bytes.set(wire);return Promise.resolve(wire.length);}} as Deno.TlsConn;
  await assert.rejects(pinnedResource('https://verified.example.com/icon.png',new AbortController().signal,{accept:'image/png',byteLimit:1024},{resolve:()=>Promise.resolve(['8.8.8.8']),connect:()=>Promise.resolve({close(){closed=true;}} as Deno.TcpConn),secure:()=>Promise.resolve(tls)}));assert.equal(closed,true);
});
