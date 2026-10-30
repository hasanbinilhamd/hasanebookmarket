export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({status:'ok',service:'backend'}, {headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
}
