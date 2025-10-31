// Quick test to verify Resend API key works
// Run: node test-resend-api.mjs

const RESEND_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual key

async function testResend() {
  console.log('🧪 Testing Resend API...\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HiveCraic <info@hivecraic.com>',
        to: ['YOUR_EMAIL@example.com'], // Replace with your email
        subject: 'Test from Resend API',
        html: '<p><strong>Success!</strong> Resend API is working.</p>',
      }),
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS! Check your email inbox (or spam folder)');
      console.log('Email ID:', data.id);
    } else {
      console.log('\n❌ FAILED!');
      console.log('Error:', data.message || data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testResend();
