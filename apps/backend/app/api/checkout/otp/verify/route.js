import {post, options} from '../../../../../lib/checkout-runtime.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){return post(request,'verify')}
export async function OPTIONS(request){return options(request)}
