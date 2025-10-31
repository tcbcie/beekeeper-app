// test-resend-api.js (Node 18+; ESM)
// Run: node test-resend-api.mjs
import { Resend } from 'resend';

//const resend = new Resend(process.env.re_WqrriZhm_MgU3G8tumSNoXPPuUquhaDjS);
const resend = new Resend('re_hEsrPdKC_HcAgbqoxNiCG5YecofYAacBJ');

(async () => {
  const { data, error } = await resend.emails.send({
    from: 'HiveCraic <noreply@hivecraic.com>',   // keep their test sender for smoke tests
    to: 'rico@zmarzly.me',
    subject: 'Hello World',
    html: '<strong>it works!</strong>',
  });

  if (error) {
    // log as much as possible while redacting secrets in CI logs
    console.error('Resend SDK error:', {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause,
    });
    return;
  }

  console.log('Sent:', data); // contains an id you can search in the dashboard
})();

