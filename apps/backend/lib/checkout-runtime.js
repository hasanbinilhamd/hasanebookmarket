import {PrismaClient} from '@prisma/client';
import nodemailer from 'nodemailer';
import {isIP} from 'node:net';
import {createCheckoutService,CheckoutError} from './guest-checkout.js';

let client;
function service() {
  if(!process.env.DATABASE_URL) throw new Error('Database not configured');
  client ||= new PrismaClient({log:[]});
  return createCheckoutService({db:client,otpPepper:process.env.CHECKOUT_OTP_PEPPER,rateLimitSecret:process.env.CHECKOUT_RATE_LIMIT_SECRET,sendOtp:sendOtpMail});
}
async function sendOtpMail({email,code}) {
  const {SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASSWORD,EMAIL_FROM}=process.env;
  const port=Number(SMTP_PORT);
  if(!SMTP_HOST||!SMTP_USER||!SMTP_PASSWORD||!EMAIL_FROM||![465,587].includes(port)) throw new Error('Email not configured');
  const transport=nodemailer.createTransport({host:SMTP_HOST,port,secure:port===465,requireTLS:port===587,auth:{user:SMTP_USER,pass:SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  try { await transport.sendMail({from:EMAIL_FROM,to:email,subject:'Kode verifikasi checkout Hasan Ebook Market',text:`Kode verifikasi checkout Anda adalah ${code}. Kode berlaku 10 menit. Jangan bagikan kode ini.`}); }
  finally {transport.close();}
}
function allowedOrigin(request) {
  const origin=request.headers.get('origin');
  if(!origin||origin==='null') return null;
  const allowed=(process.env.ALLOWED_WEB_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return allowed.includes(origin)?origin:null;
}
function headers(origin) {return {'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','vary':'Origin',...(origin?{'access-control-allow-origin':origin}:{})};}
function ipFor(request) {
  if(process.env.VERCEL==='1') {
    const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if(!isIP(ip||'')) throw new CheckoutError(503,'unavailable');
    return ip;
  }
  // Only development/test can use the local bucket; never trust arbitrary
  // forwarded headers outside a verified hosting proxy.
  if(process.env.NODE_ENV!=='production') return '127.0.0.1';
  throw new CheckoutError(503,'unavailable');
}
async function readJson(request) {
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')) throw new CheckoutError(415,'invalid_input');
  const reader=request.body?.getReader(); if(!reader) throw new CheckoutError(400,'invalid_input');
  let bytes=0,parts=[];
  while(true){const {done,value}=await reader.read();if(done) break;bytes+=value.byteLength;if(bytes>4096){await reader.cancel();throw new CheckoutError(413,'invalid_input')}parts.push(value)}
  const text=Buffer.concat(parts.map(x=>Buffer.from(x))).toString('utf8');
  let body;try{body=JSON.parse(text)}catch{throw new CheckoutError(400,'invalid_input')}
  if(!body || typeof body!=='object' || Array.isArray(body)) throw new CheckoutError(400,'invalid_input');return body;
}
export function options(request) {
  const origin=allowedOrigin(request);if(!origin) return Response.json({error:'forbidden'},{status:403,headers:headers(null)});
  const method=request.headers.get('access-control-request-method');
  const requested=(request.headers.get('access-control-request-headers')||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
  if(method!=='POST'||requested.some(x=>x!=='content-type')) return Response.json({error:'forbidden'},{status:403,headers:headers(origin)});
  return new Response(null,{status:204,headers:{...headers(origin),'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'Content-Type','access-control-max-age':'600'}});
}
export async function post(request,action) {
  const origin=allowedOrigin(request);if(!origin) return Response.json({error:'forbidden'},{status:403,headers:headers(null)});
  try {
    const body=await readJson(request),ip=ipFor(request),svc=service();let result;
    if(action==='draft') result=await svc.createDraft({name:body.name,email:body.email,whatsapp:body.whatsapp,ip});
    else if(action==='send') result=await svc.requestOtp({draftId:body.draftId,capability:body.capability,ip});
    else if(action==='verify') result=await svc.verifyOtp({draftId:body.draftId,capability:body.capability,code:body.code,ip});
    else throw new CheckoutError(404,'not_found');
    return Response.json(result,{status:200,headers:headers(origin)});
  } catch(e) {
    // Never log e: driver or mailer errors may include customer data or tokens.
    const status=e instanceof CheckoutError?e.status:503;
    const code=e instanceof CheckoutError?e.code:'unavailable';
    return Response.json({error:code},{status,headers:headers(origin)});
  }
}
