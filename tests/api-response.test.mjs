import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApiResponse } from '../lib/api-response.ts';
test('identifies an HTML hosting fallback instead of attempting JSON parsing',async()=>{
 await assert.rejects(validateApiResponse(new Response('<html>page</html>',{headers:{'Content-Type':'text/html'}})),/non-JSON response/);
});
test('preserves the Firebase configuration error from a JSON API response',async()=>{
 await assert.rejects(validateApiResponse(Response.json({error:'Firebase server connection is not configured yet.'},{status:503})),/Firebase server connection/);
});
test('keeps a successful JSON body available to the caller',async()=>{
 const response=await validateApiResponse(Response.json({notes:[]}));assert.deepEqual(await response.json(),{notes:[]});
});

test('distinguishes hosting access protection from missing API routes', async () => {
 await assert.rejects(validateApiResponse(new Response('<html>Sign in</html>', {status:401, headers:{'Content-Type':'text/html'}})), /restricted by the hosting provider/);
});
