// Copy and paste this into your browser console (F12) while on the Settings page
// This will test the toggle_user_account function directly

// Test the toggle_user_account RPC function
async function testToggleAccount() {
  // Get Supabase client from window (it should be available)
  const { createClient } = window.supabase || {};

  if (!createClient) {
    console.error('❌ Supabase client not found in window');
    console.log('Try importing manually:');
    console.log('import { supabase } from "@/lib/supabase"');
    return;
  }

  console.log('🔍 Testing toggle_user_account function...');

  // First, let's get the list of users
  console.log('\n1️⃣ Fetching users...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: users, error: usersError } = await supabase
    .rpc('get_users_with_email');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }

  console.log('✅ Users fetched:', users);
  console.table(users.map(u => ({
    email: u.email,
    role: u.role,
    is_active: u.is_active
  })));

  // Find a non-admin user to test with
  const testUser = users.find(u => u.role !== 'Admin' && u.id !== (await supabase.auth.getUser()).data.user?.id);

  if (!testUser) {
    console.error('❌ No non-admin user found to test with');
    return;
  }

  console.log('\n2️⃣ Testing with user:', testUser.email);
  console.log('Current status:', testUser.is_active);

  // Try to toggle the account
  const newStatus = !testUser.is_active;
  console.log(`\n3️⃣ Attempting to ${newStatus ? 'enable' : 'disable'} account...`);

  const { data: result, error: toggleError } = await supabase
    .rpc('toggle_user_account', {
      target_user_id: testUser.id,
      enable_account: newStatus
    });

  if (toggleError) {
    console.error('❌ Error toggling account:', toggleError);
    console.error('Error details:', JSON.stringify(toggleError, null, 2));
    return;
  }

  console.log('✅ Toggle successful!');
  console.log('Result:', result);

  // Verify the change
  console.log('\n4️⃣ Verifying change...');
  const { data: updatedUsers, error: verifyError } = await supabase
    .rpc('get_users_with_email');

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
    return;
  }

  const updatedUser = updatedUsers.find(u => u.id === testUser.id);
  console.log('Updated user status:', updatedUser.is_active);

  if (updatedUser.is_active === newStatus) {
    console.log('✅ ✅ ✅ STATUS CHANGED SUCCESSFULLY! ✅ ✅ ✅');
  } else {
    console.log('❌ Status did not change in database');
  }
}

// Run the test
console.log('🚀 Starting toggle account test...');
testToggleAccount().catch(console.error);
