// Supabase Edge Function: auto-accept-invitations
// Webhook called when new user signs up to auto-accept team invitations
// Date: 2025-10-30
// Alternative to database trigger (no auth.users permission needed)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface WebhookPayload {
  type: string
  table: string
  record: {
    id: string
    email: string
    created_at: string
  }
  schema: string
  old_record: null | object
}

serve(async (req) => {
  try {
    // Parse webhook payload
    const payload: WebhookPayload = await req.json()

    console.log('🔔 Webhook received:', {
      type: payload.type,
      table: payload.table,
      userId: payload.record.id,
      email: payload.record.email,
    })

    // Verify this is a user INSERT event
    if (payload.type !== 'INSERT' || payload.table !== 'users') {
      console.log('ℹ️ Ignoring non-INSERT or non-users event')
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userId = payload.record.id
    const userEmail = payload.record.email

    if (!userId || !userEmail) {
      console.error('❌ Missing user ID or email in payload')
      return new Response(
        JSON.stringify({ error: 'Missing user data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role (elevated permissions)
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🔍 Looking for pending invitations for:', userEmail)

    // Find all pending, non-expired invitations for this email
    const { data: invitations, error: fetchError } = await supabase
      .from('team_invitations')
      .select('id, team_id, email, invited_by, expires_at')
      .ilike('email', userEmail) // Case-insensitive match
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('❌ Error fetching invitations:', fetchError)
      throw fetchError
    }

    if (!invitations || invitations.length === 0) {
      console.log('ℹ️ No pending invitations found for', userEmail)
      return new Response(
        JSON.stringify({
          message: 'No pending invitations',
          userId,
          email: userEmail,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Found ${invitations.length} pending invitation(s)`)

    let acceptedCount = 0
    const results = []

    // Process each invitation
    for (const invitation of invitations) {
      console.log(`🎯 Processing invitation to team ${invitation.team_id}`)

      try {
        // Check if user is already a member (safety check)
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', invitation.team_id)
          .eq('user_id', userId)
          .maybeSingle()

        if (existingMember) {
          console.log(`⚠️ User already member of team ${invitation.team_id}`)
          results.push({
            invitationId: invitation.id,
            teamId: invitation.team_id,
            status: 'already_member',
          })
          continue
        }

        // Add user to team_members
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: invitation.team_id,
            user_id: userId,
            role: 'member',
          })

        if (memberError) {
          console.error(`❌ Error adding user to team ${invitation.team_id}:`, memberError)
          results.push({
            invitationId: invitation.id,
            teamId: invitation.team_id,
            status: 'error',
            error: memberError.message,
          })
          continue
        }

        // Update invitation status to accepted
        const { error: updateError } = await supabase
          .from('team_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', invitation.id)

        if (updateError) {
          console.error(`❌ Error updating invitation ${invitation.id}:`, updateError)
        }

        acceptedCount++
        console.log(`✅ User ${userId} added to team ${invitation.team_id}`)

        results.push({
          invitationId: invitation.id,
          teamId: invitation.team_id,
          status: 'accepted',
        })

      } catch (error) {
        console.error(`❌ Error processing invitation ${invitation.id}:`, error)
        results.push({
          invitationId: invitation.id,
          teamId: invitation.team_id,
          status: 'error',
          error: error.message,
        })
      }
    }

    console.log(`🎉 Auto-accepted ${acceptedCount} of ${invitations.length} invitation(s) for ${userEmail}`)

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: userEmail,
        invitationsFound: invitations.length,
        invitationsAccepted: acceptedCount,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Error in auto-accept webhook:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to process auto-accept',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
