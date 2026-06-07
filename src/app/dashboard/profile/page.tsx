'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { User, Calendar, Edit2, Save, Download, Trash2, Phone, Palette, Scale, Users, Crown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard'
import RenewSubscriptionModal from '@/components/RenewSubscriptionModal'
import SubscriptionHistoryTable from '@/components/SubscriptionHistoryTable'
import { ThemeSwitcher } from '@/components/theme-switcher'
import type { SubscriptionStatusResponse } from '@/types/subscription'
import { useToast } from '@/components/ui/Toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Panel from '@/components/ui/Panel'
import ModalShell from '@/components/ui/ModalShell'
import FormActionRow from '@/components/ui/FormActionRow'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import SelectField from '@/components/ui/SelectField'
import Button from '@/components/ui/Button'

interface UserProfile {
 id: string
 role: 'User' | 'Admin'
 created_at: string
 updated_at: string
 email?: string
 first_name?: string
 last_name?: string
 mobile_number?: string
 producer_address?: string
 breeder_code?: string
 user_id?: string
 association_id?: string | null
 member_fibka?: boolean
 member_iba?: boolean
 member_nihbs?: boolean
 is_uk_ni_resident?: boolean
 enable_task_email_reminders?: boolean
 enable_event_email_reminders?: boolean
 task_reminder_frequency?: 'realtime' | 'daily' | 'weekly' | 'disabled'
 enable_label_printing?: boolean
}

interface Association {
 id: string
 name: string
 jurisdiction: string
 county_area: string
 affiliation: string
}

export default function ProfilePage() {
 const [userId, setUserId] = useState<string | null>(null)
 const [, setUserRole] = useState<UserRole>('User')
 const [, setCreatedAt] = useState<string>('')
 const [loading, setLoading] = useState(true)
 const router = useRouter()
 const searchParams = useSearchParams()
 const toast = useToast()
 const [, setPaymentStatus] = useState<string | null>(null)

 // Profile editing state
 const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
 const [editingProfile, setEditingProfile] = useState(false)
 const [profileFormData, setProfileFormData] = useState({
 first_name: '',
 last_name: '',
 mobile_number: '',
 producer_address: '',
 breeder_code: '',
 association_id: null as string | null,
 member_fibka: false,
 member_iba: false,
 member_nihbs: false,
 is_uk_ni_resident: false,
 enable_task_email_reminders: true,
 enable_event_email_reminders: true,
 task_reminder_frequency: 'daily' as 'realtime' | 'daily' | 'weekly' | 'disabled',
 enable_label_printing: false,
 })
 const [savingProfile, setSavingProfile] = useState(false)
 const [associations, setAssociations] = useState<Association[]>([])
 const [loadingAssociations, setLoadingAssociations] = useState(false)

 // Data export state
 const [exportingMyData, setExportingMyData] = useState(false)

 // Account deletion state
 const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
 const [deleteConfirmText, setDeleteConfirmText] = useState('')
 const [deletingAccount, setDeletingAccount] = useState(false)

 // Subscription state
 const [showRenewSubscriptionModal, setShowRenewSubscriptionModal] = useState(false)
 const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null)

 // Change password state
 const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
 const [currentPassword, setCurrentPassword] = useState('')
 const [newPassword, setNewPassword] = useState('')
 const [confirmPassword, setConfirmPassword] = useState('')
 const [changingPassword, setChangingPassword] = useState(false)
 const [passwordError, setPasswordError] = useState('')
 const [subscriptionRefreshKey, setSubscriptionRefreshKey] = useState(0)

 const fetchSubscriptionStatus = useCallback(async () => {
 try {
 const { data, error } = await supabase.rpc('get_subscription_status')
 if (error) throw error
 setSubscriptionStatus(data as SubscriptionStatusResponse)
 } catch (error) {
 console.error('Error fetching subscription status:', error)
 }
 }, [])

 const fetchAssociations = useCallback(async () => {
 setLoadingAssociations(true)
 try {
 const { data, error } = await supabase
 .from('beekeeping_associations')
 .select('id, name, jurisdiction, county_area, affiliation')
 .order('jurisdiction', { ascending: true })
 .order('name', { ascending: true })

 if (error) throw error

 setAssociations(data || [])
 } catch (error) {
 console.error('Error fetching associations:', error)
 } finally {
 setLoadingAssociations(false)
 }
 }, [])

 const fetchUserProfile = useCallback(async () => {
 if (!userId) return

 try {
 const { data, error } = await supabase
 .from('profiles')
 .select('*')
 .eq('id', userId)
 .maybeSingle()

 if (error) throw error

 if (data) {
 setUserProfile(data as UserProfile)
 setProfileFormData({
 first_name: data.first_name || '',
 last_name: data.last_name || '',
 mobile_number: data.mobile_number || '',
 producer_address: data.producer_address || '',
 breeder_code: data.breeder_code || '',
 association_id: data.association_id || null,
 member_fibka: data.member_fibka || false,
 member_iba: data.member_iba || false,
 member_nihbs: data.member_nihbs || false,
 is_uk_ni_resident: data.is_uk_ni_resident || false,
 enable_task_email_reminders: data.enable_task_email_reminders !== undefined ? data.enable_task_email_reminders : true,
 enable_event_email_reminders: data.enable_event_email_reminders !== undefined ? data.enable_event_email_reminders : true,
 task_reminder_frequency: data.task_reminder_frequency || 'daily',
 enable_label_printing: data.enable_label_printing === true,
 })
 }
 } catch (error) {
 console.error('Error fetching user profile:', error)
 }
 }, [userId])

 const updateUserProfile = async () => {
 if (!userId) return

 setSavingProfile(true)
 try {
 const breederCode = profileFormData.breeder_code ? profileFormData.breeder_code.trim().toUpperCase() : null

 // Breeder codes are app-wide unique. Pre-check for a friendly message; the DB unique
 // index is the hard guarantee against races.
 if (breederCode) {
 const { data: available, error: checkError } = await supabase.rpc('is_breeder_code_available', { p_code: breederCode })
 if (!checkError && available === false) {
 toast.error(`Breeder code "${breederCode}" is already taken. Please choose another.`)
 setSavingProfile(false)
 return
 }
 }

 // Update existing profile (profiles are created automatically via trigger on signup)
 const { error } = await supabase
 .from('profiles')
 .update({
 first_name: profileFormData.first_name || null,
 last_name: profileFormData.last_name || null,
 mobile_number: profileFormData.mobile_number || null,
 producer_address: profileFormData.producer_address || null,
 breeder_code: breederCode,
 association_id: profileFormData.association_id || null,
 member_fibka: profileFormData.member_fibka,
 member_iba: profileFormData.member_iba,
 member_nihbs: profileFormData.member_nihbs,
 is_uk_ni_resident: profileFormData.is_uk_ni_resident,
 enable_task_email_reminders: profileFormData.enable_task_email_reminders,
 enable_event_email_reminders: profileFormData.enable_event_email_reminders,
 task_reminder_frequency: profileFormData.task_reminder_frequency,
 enable_label_printing: profileFormData.enable_label_printing,
 })
 .eq('id', userId)

 if (error) {
 // 23505 = unique violation (breeder code taken between pre-check and write).
 if ((error as { code?: string }).code === '23505') {
 toast.error(`Breeder code "${breederCode}" is already taken. Please choose another.`)
 return
 }
 console.error('Error updating profile:', error)
 throw error
 }

 toast.success('Profile updated successfully!')
 setEditingProfile(false)
 fetchUserProfile() // Refresh profile data
 } catch (error) {
 console.error('Error updating profile:', error)
 const errorMessage = error instanceof Error ? error.message : 'Unknown error'
 toast.error(`Failed to update profile: ${errorMessage}`)
 } finally {
 setSavingProfile(false)
 }
 }

 const handleCancelProfileEdit = () => {
 setEditingProfile(false)
 // Reset form data to current profile values
 if (userProfile) {
 setProfileFormData({
 first_name: userProfile.first_name || '',
 last_name: userProfile.last_name || '',
 mobile_number: userProfile.mobile_number || '',
 producer_address: userProfile.producer_address || '',
 breeder_code: userProfile.breeder_code || '',
 association_id: userProfile.association_id || null,
 member_fibka: userProfile.member_fibka || false,
 member_iba: userProfile.member_iba || false,
 member_nihbs: userProfile.member_nihbs || false,
 is_uk_ni_resident: userProfile.is_uk_ni_resident || false,
 enable_task_email_reminders: userProfile.enable_task_email_reminders !== undefined ? userProfile.enable_task_email_reminders : true,
 enable_event_email_reminders: userProfile.enable_event_email_reminders !== undefined ? userProfile.enable_event_email_reminders : true,
 task_reminder_frequency: userProfile.task_reminder_frequency || 'daily',
 enable_label_printing: userProfile.enable_label_printing === true,
 })
 }
 }

 const exportMyDataAsJSON = async () => {
 if (!userId) return

 setExportingMyData(true)
 try {
 // Fetch all user data
 const [
 { data: apiaries },
 { data: hives },
 { data: queens },
 { data: inspections },
 { data: varroaChecks },
 { data: varroaTreatments },
 { data: feedings },
 { data: harvests },
 { data: rearingBatches },
 { data: tasksEvents },
 { data: colonies },
 { data: colonyMovements },
 { data: gddRecords },
 { data: financialRecords },
 { data: batchGrafts },
 { data: graftDistributions },
 { data: matingNucs },
 { data: matingNucInspections },
 { data: matingNucBatches },
 { data: wildColonies },
 { data: wildColonyInspections },
 { data: diagnosisImages },
 { data: diagnosisImageComments },
 { data: qrTags },
 { data: logbookEntries },
 { data: conservationAreas },
 { data: bulkContainers },
 { data: purchaseItems },
 { data: batchRuns },
 { data: pushSubscriptions },
 { data: supportTickets },
 { data: reactivationRequests },
 { data: subscriptionHistory },
 { data: rearingGroupMembers },
 { data: teamMembers },
 ] = await Promise.all([
 supabase.from('apiaries').select('*').eq('user_id', userId),
 supabase.from('hives').select('*').eq('user_id', userId),
 supabase.from('queens').select('*').eq('user_id', userId),
 supabase.from('inspections').select('*').eq('user_id', userId),
 supabase.from('varroa_checks').select('*').eq('user_id', userId),
 supabase.from('varroa_treatments').select('*').eq('user_id', userId),
 supabase.from('feedings').select('*').eq('user_id', userId),
 supabase.from('harvests').select('*').eq('user_id', userId),
 supabase.from('rearing_batches').select('*').eq('user_id', userId),
 supabase.from('tasks_events').select('*').eq('user_id', userId),
 supabase.from('colonies').select('*').eq('user_id', userId),
 supabase.from('colony_movements').select('*').eq('user_id', userId),
 supabase.from('gdd_records').select('*').eq('user_id', userId),
 supabase.from('financial_records').select('*').eq('user_id', userId),
 supabase.from('batch_grafts').select('*').eq('user_id', userId),
 supabase.from('graft_distributions').select('*').eq('user_id', userId),
 supabase.from('mating_nucs').select('*').eq('user_id', userId),
 supabase.from('mating_nuc_inspections').select('*').eq('user_id', userId),
 supabase.from('mating_nuc_batches').select('*').eq('user_id', userId),
 supabase.from('wild_colonies').select('*').eq('user_id', userId),
 supabase.from('wild_colony_inspections').select('*').eq('user_id', userId),
 supabase.from('diagnosis_images').select('*').eq('user_id', userId),
 supabase.from('diagnosis_image_comments').select('*').eq('user_id', userId),
 supabase.from('qr_tags').select('*').eq('user_id', userId),
 supabase.from('logbook_entries').select('*').eq('user_id', userId),
 supabase.from('conservation_areas').select('*').eq('user_id', userId),
 supabase.from('bulk_containers').select('*').eq('user_id', userId),
 supabase.from('purchase_items').select('*').eq('user_id', userId),
 supabase.from('batch_runs').select('*').eq('user_id', userId),
 supabase.from('push_subscriptions').select('*').eq('user_id', userId),
 supabase.from('support_tickets').select('*').eq('user_id', userId),
 supabase.from('reactivation_requests').select('*').eq('user_id', userId),
 supabase.from('subscription_history').select('*').eq('user_id', userId),
 supabase.from('rearing_group_members').select('*').eq('user_id', userId),
 supabase.from('team_members').select('*').eq('user_id', userId),
 ])

 const exportData = {
 export_info: {
 exported_at: new Date().toISOString(),
 user_id: userId,
 format: 'JSON',
 },
 apiaries: apiaries || [],
 hives: hives || [],
 queens: queens || [],
 inspections: inspections || [],
 varroa_checks: varroaChecks || [],
 varroa_treatments: varroaTreatments || [],
 feedings: feedings || [],
 harvests: harvests || [],
 rearing_batches: rearingBatches || [],
 tasks_events: tasksEvents || [],
 colonies: colonies || [],
 colony_movements: colonyMovements || [],
 gdd_records: gddRecords || [],
 financial_records: financialRecords || [],
 batch_grafts: batchGrafts || [],
 graft_distributions: graftDistributions || [],
 mating_nucs: matingNucs || [],
 mating_nuc_inspections: matingNucInspections || [],
 mating_nuc_batches: matingNucBatches || [],
 wild_colonies: wildColonies || [],
 wild_colony_inspections: wildColonyInspections || [],
 diagnosis_images: diagnosisImages || [],
 diagnosis_image_comments: diagnosisImageComments || [],
 qr_tags: qrTags || [],
 logbook_entries: logbookEntries || [],
 conservation_areas: conservationAreas || [],
 bulk_containers: bulkContainers || [],
 purchase_items: purchaseItems || [],
 batch_runs: batchRuns || [],
 push_subscriptions: pushSubscriptions || [],
 support_tickets: supportTickets || [],
 reactivation_requests: reactivationRequests || [],
 subscription_history: subscriptionHistory || [],
 rearing_group_members: rearingGroupMembers || [],
 team_members: teamMembers || [],
 }

 const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: 2025-11-03T14-30-45
 a.download = `hivecraic-backup-${timestamp}.json`
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)
 URL.revokeObjectURL(url)

 toast.success('Your data has been exported successfully!')
 } catch (error) {
 console.error('Error exporting data:', error)
 toast.error('Failed to export data. Check console for details.')
 } finally {
 setExportingMyData(false)
 }
 }

 const exportMyDataAsCSV = async () => {
 if (!userId) return

 setExportingMyData(true)
 try {
 // Fetch all user data
 const [
 { data: apiaries },
 { data: hives },
 { data: queens },
 { data: inspections },
 { data: varroaChecks },
 { data: varroaTreatments },
 { data: feedings },
 { data: harvests },
 { data: rearingBatches },
 { data: tasksEvents },
 { data: colonies },
 { data: colonyMovements },
 { data: gddRecords },
 { data: financialRecords },
 { data: batchGrafts },
 { data: graftDistributions },
 { data: matingNucs },
 { data: matingNucInspections },
 { data: matingNucBatches },
 { data: wildColonies },
 { data: wildColonyInspections },
 { data: diagnosisImages },
 { data: diagnosisImageComments },
 { data: qrTags },
 { data: logbookEntries },
 { data: conservationAreas },
 { data: bulkContainers },
 { data: purchaseItems },
 { data: batchRuns },
 { data: pushSubscriptions },
 { data: supportTickets },
 { data: reactivationRequests },
 { data: subscriptionHistory },
 { data: rearingGroupMembers },
 { data: teamMembers },
 ] = await Promise.all([
 supabase.from('apiaries').select('*').eq('user_id', userId),
 supabase.from('hives').select('*').eq('user_id', userId),
 supabase.from('queens').select('*').eq('user_id', userId),
 supabase.from('inspections').select('*').eq('user_id', userId),
 supabase.from('varroa_checks').select('*').eq('user_id', userId),
 supabase.from('varroa_treatments').select('*').eq('user_id', userId),
 supabase.from('feedings').select('*').eq('user_id', userId),
 supabase.from('harvests').select('*').eq('user_id', userId),
 supabase.from('rearing_batches').select('*').eq('user_id', userId),
 supabase.from('tasks_events').select('*').eq('user_id', userId),
 supabase.from('colonies').select('*').eq('user_id', userId),
 supabase.from('colony_movements').select('*').eq('user_id', userId),
 supabase.from('gdd_records').select('*').eq('user_id', userId),
 supabase.from('financial_records').select('*').eq('user_id', userId),
 supabase.from('batch_grafts').select('*').eq('user_id', userId),
 supabase.from('graft_distributions').select('*').eq('user_id', userId),
 supabase.from('mating_nucs').select('*').eq('user_id', userId),
 supabase.from('mating_nuc_inspections').select('*').eq('user_id', userId),
 supabase.from('mating_nuc_batches').select('*').eq('user_id', userId),
 supabase.from('wild_colonies').select('*').eq('user_id', userId),
 supabase.from('wild_colony_inspections').select('*').eq('user_id', userId),
 supabase.from('diagnosis_images').select('*').eq('user_id', userId),
 supabase.from('diagnosis_image_comments').select('*').eq('user_id', userId),
 supabase.from('qr_tags').select('*').eq('user_id', userId),
 supabase.from('logbook_entries').select('*').eq('user_id', userId),
 supabase.from('conservation_areas').select('*').eq('user_id', userId),
 supabase.from('bulk_containers').select('*').eq('user_id', userId),
 supabase.from('purchase_items').select('*').eq('user_id', userId),
 supabase.from('batch_runs').select('*').eq('user_id', userId),
 supabase.from('push_subscriptions').select('*').eq('user_id', userId),
 supabase.from('support_tickets').select('*').eq('user_id', userId),
 supabase.from('reactivation_requests').select('*').eq('user_id', userId),
 supabase.from('subscription_history').select('*').eq('user_id', userId),
 supabase.from('rearing_group_members').select('*').eq('user_id', userId),
 supabase.from('team_members').select('*').eq('user_id', userId),
 ])

 const convertToCSV = (data: Record<string, unknown>[], tableName: string) => {
 if (!data || data.length === 0) return `${tableName}\nNo data\n\n`

 const headers = Object.keys(data[0])
 const rows = data.map(row =>
 headers.map(header => {
 const value = row[header]
 if (value === null || value === undefined) return ''
 if (typeof value === 'string' && value.includes(',')) return `"${value}"`
 return value
 }).join(',')
 )

 return `${tableName}\n${headers.join(',')}\n${rows.join('\n')}\n\n`
 }

 let csvContent = `Beekeeping Data Export\nExported on: ${new Date().toISOString()}\n\n`
 csvContent += convertToCSV(apiaries || [], 'Apiaries')
 csvContent += convertToCSV(hives || [], 'Hives')
 csvContent += convertToCSV(queens || [], 'Queens')
 csvContent += convertToCSV(inspections || [], 'Inspections')
 csvContent += convertToCSV(varroaChecks || [], 'Varroa Checks')
 csvContent += convertToCSV(varroaTreatments || [], 'Varroa Treatments')
 csvContent += convertToCSV(feedings || [], 'Feedings')
 csvContent += convertToCSV(harvests || [], 'Harvests')
 csvContent += convertToCSV(rearingBatches || [], 'Rearing Batches')
 csvContent += convertToCSV(tasksEvents || [], 'Tasks and Events')
 csvContent += convertToCSV(colonies || [], 'Colonies')
 csvContent += convertToCSV(colonyMovements || [], 'Colony Movements')
 csvContent += convertToCSV(gddRecords || [], 'GDD Records')
 csvContent += convertToCSV(financialRecords || [], 'Financial Records')
 csvContent += convertToCSV(batchGrafts || [], 'Batch Grafts')
 csvContent += convertToCSV(graftDistributions || [], 'Graft Distributions')
 csvContent += convertToCSV(matingNucs || [], 'Mating Nucs')
 csvContent += convertToCSV(matingNucInspections || [], 'Mating Nuc Inspections')
 csvContent += convertToCSV(matingNucBatches || [], 'Mating Nuc Batches')
 csvContent += convertToCSV(wildColonies || [], 'Wild Colonies')
 csvContent += convertToCSV(wildColonyInspections || [], 'Wild Colony Inspections')
 csvContent += convertToCSV(diagnosisImages || [], 'Diagnosis Images')
 csvContent += convertToCSV(diagnosisImageComments || [], 'Diagnosis Image Comments')
 csvContent += convertToCSV(qrTags || [], 'QR Tags')
 csvContent += convertToCSV(logbookEntries || [], 'Logbook Entries')
 csvContent += convertToCSV(conservationAreas || [], 'Conservation Areas')
 csvContent += convertToCSV(bulkContainers || [], 'Bulk Containers')
 csvContent += convertToCSV(purchaseItems || [], 'Purchase Items')
 csvContent += convertToCSV(batchRuns || [], 'Batch Runs')
 csvContent += convertToCSV(pushSubscriptions || [], 'Push Subscriptions')
 csvContent += convertToCSV(supportTickets || [], 'Support Tickets')
 csvContent += convertToCSV(reactivationRequests || [], 'Reactivation Requests')
 csvContent += convertToCSV(subscriptionHistory || [], 'Subscription History')
 csvContent += convertToCSV(rearingGroupMembers || [], 'Rearing Group Members')
 csvContent += convertToCSV(teamMembers || [], 'Team Members')

 const blob = new Blob([csvContent], { type: 'text/csv' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: 2025-11-03T14-30-45
 a.download = `hivecraic-backup-${timestamp}.csv`
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)
 URL.revokeObjectURL(url)

 toast.success('Your data has been exported successfully!')
 } catch (error) {
 console.error('Error exporting data:', error)
 toast.error('Failed to export data. Check console for details.')
 } finally {
 setExportingMyData(false)
 }
 }

 // Change password handler
 const handleChangePassword = async () => {
 setPasswordError('')

 // Validation
 if (!currentPassword || !newPassword || !confirmPassword) {
 setPasswordError('All fields are required')
 return
 }

 if (newPassword.length < 8) {
 setPasswordError('New password must be at least 8 characters long')
 return
 }

 if (newPassword !== confirmPassword) {
 setPasswordError('New passwords do not match')
 return
 }

 if (currentPassword === newPassword) {
 setPasswordError('New password must be different from current password')
 return
 }

 setChangingPassword(true)

 try {
 // Update password using Supabase Auth
 const { error } = await supabase.auth.updateUser({
 password: newPassword
 })

 if (error) {
 if (error.message.includes('same as the old password')) {
 setPasswordError('New password must be different from current password')
 } else {
 setPasswordError(error.message)
 }
 return
 }

 // Success
 toast.success('Password changed successfully!')
 setShowChangePasswordModal(false)
 setCurrentPassword('')
 setNewPassword('')
 setConfirmPassword('')
 } catch (error) {
 console.error('Error changing password:', error)
 setPasswordError('An unexpected error occurred. Please try again.')
 } finally {
 setChangingPassword(false)
 }
 }

 // Delete account handler
 const handleDeleteAccount = async () => {
 if (!userId) return

 // Verify confirmation text
 if (deleteConfirmText !== 'DELETE') {
 toast.warning('Please type DELETE to confirm account deletion.')
 return
 }

 setDeletingAccount(true)
 try {
 // Call the delete_own_account RPC function
 const { error } = await supabase.rpc('delete_own_account')

 if (error) {
 console.error('Error deleting account:', error)
 throw error
 }

 // Sign out the user - use local scope
 await supabase.auth.signOut({ scope: 'local' })

 // Show success message with reactivation info
 toast.success('Your account has been deleted. Your data will be retained for 12 months. You can reactivate via the login page.')

 // Redirect to login page
 router.push('/login')
 } catch (error) {
 console.error('Error deleting account:', error)
 const errorMessage = error instanceof Error ? error.message : 'Unknown error'
 toast.error(`Failed to delete account: ${errorMessage}. Please try again or contact support.`)
 } finally {
 setDeletingAccount(false)
 setShowDeleteAccountModal(false)
 setDeleteConfirmText('')
 }
 }

 // Handle payment status from URL
 useEffect(() => {
 const payment = searchParams.get('payment')
 if (payment) {
 setPaymentStatus(payment)
 // Clear the payment parameter from URL
 const newUrl = window.location.pathname
 window.history.replaceState({}, '', newUrl)

 // Show toast based on payment status
 if (payment === 'success') {
 setTimeout(() => {
 toast.success('Payment successful! Your subscription has been activated.')
 }, 500)
 } else if (payment === 'cancelled') {
 setTimeout(() => {
 toast.info('Payment was cancelled. You can try again whenever you\'re ready.')
 }, 500)
 }
 }
 }, [searchParams, toast])

 useEffect(() => {
 const initUser = async () => {
 const id = await getCurrentUserId()
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)

 // Get user email from Supabase auth
 const { data: { user } } = await supabase.auth.getUser()
 if (user) {
 setCreatedAt(user.created_at || '')
 }

 // Get user role
 const role = await getUserRole()
 setUserRole(role)

 setLoading(false)
 }
 initUser()
 }, [router])

 // Fetch user profile when userId is set
 useEffect(() => {
 if (userId) {
 fetchUserProfile()
 fetchAssociations()
 fetchSubscriptionStatus()
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [userId])

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <LoadingSpinner size="lg" />
 </div>
 )
 }

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <User size={32} className="text-text-tertiary" />
 <h1 className="text-3xl font-bold text-foreground">Profile</h1>
 </div>

 {/* Profile Information */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
 {!editingProfile && (
 <Button
 onClick={() => setEditingProfile(true)}
 tone="success"
 size="sm"
 >
 <Edit2 size={16} />
 Edit Profile
 </Button>
 )}
 </div>

 {editingProfile ? (
 /* Edit Mode */
 <div className="space-y-4">
 <p className="text-sm text-text-tertiary mb-4">
 Update your personal information. All fields are optional.
 </p>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <FieldLabel>First Name</FieldLabel>
 <TextInput
 type="text"
 value={profileFormData.first_name}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, first_name: e.target.value })
 }
 placeholder="Enter your first name"
 />
 </div>

 <div>
 <FieldLabel>Last Name</FieldLabel>
 <TextInput
 type="text"
 value={profileFormData.last_name}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, last_name: e.target.value })
 }
 placeholder="Enter your last name"
 />
 </div>

 <div className="md:col-span-2">
 <FieldLabel>Mobile Number</FieldLabel>
 <TextInput
 type="tel"
 value={profileFormData.mobile_number}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, mobile_number: e.target.value })
 }
 placeholder="Enter your mobile number"
 />
 </div>

 <div className="md:col-span-2">
 <FieldLabel>Producer Address</FieldLabel>
 <TextInput
 type="text"
 value={profileFormData.producer_address}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, producer_address: e.target.value })
 }
 placeholder="e.g. Mossfield Apiary, Athenry, Co. Galway"
 />
 <p className="mt-1 text-xs text-text-tertiary">
 Printed on retail honey labels alongside your name (EU Honey Directive requires the producer&apos;s name and address). Leave blank if you don&apos;t sell.
 </p>
 </div>

 <div>
 <FieldLabel>Breeder Code</FieldLabel>
 <TextInput
 type="text"
 value={profileFormData.breeder_code}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, breeder_code: e.target.value.toUpperCase() })
 }
 placeholder="e.g. RZ"
 maxLength={10}
 className="uppercase"
 />
 <p className="mt-1 text-xs text-text-tertiary">
 Used in the composite queen code (e.g. IE-RZ-7W-2026). Unique across HiveCraic. If blank, your initials are used.
 </p>
 </div>

 {/* Location */}
 <div className="md:col-span-2 pt-4 border-t">
 <h3 className="text-md font-medium text-foreground mb-3">Location</h3>
 <label className="flex items-center gap-3 cursor-pointer">
 <input
 type="checkbox"
 checked={profileFormData.is_uk_ni_resident}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, is_uk_ni_resident: e.target.checked })
 }
 className="w-4 h-4 text-forest-600 dark:text-indigo-600 border-border rounded focus:ring-forest-500 dark:focus:ring-emerald-500"
 />
 <span className="text-sm text-foreground">Resident in NI/UK</span>
 </label>
 <p className="text-xs text-text-tertiary mt-1 ml-7">Sets currency to GBP and pre-selects UK-authorised varroa treatments</p>
 </div>

 {/* Association Membership */}
 <div className="md:col-span-2 pt-4 border-t">
 <h3 className="text-md font-medium text-foreground mb-3">Association Membership</h3>

 <div className="space-y-4">
 <div>
 <FieldLabel className="mb-1">
 Local Beekeeping Association
 <span className="ml-2 text-xs text-text-tertiary font-normal">
 (If you are a member of a local association, select from list below)
 </span>
 </FieldLabel>
 <SelectField
 value={profileFormData.association_id || ''}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, association_id: e.target.value || null })
 }
 disabled={loadingAssociations}
 >
 <option value="">Not a member of any local association</option>
 {associations.map((assoc) => (
 <option key={assoc.id} value={assoc.id}>
 {assoc.name} - {assoc.county_area} ({assoc.jurisdiction})
 </option>
 ))}
 </SelectField>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 National Organization Memberships
 </label>
 <div className="space-y-2">
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={profileFormData.member_fibka}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, member_fibka: e.target.checked })
 }
 className="w-4 h-4 text-forest-600 dark:text-indigo-600 border-border rounded focus:ring-forest-500 dark:focus:ring-emerald-500"
 />
 <span className="text-sm text-text-secondary">
 FIBKA (Federation of Irish Beekeepers Associations)
 </span>
 </label>

 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={profileFormData.member_iba}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, member_iba: e.target.checked })
 }
 className="w-4 h-4 text-forest-600 dark:text-indigo-600 border-border rounded focus:ring-forest-500 dark:focus:ring-emerald-500"
 />
 <span className="text-sm text-text-secondary">
 IBA (Irish Beekeepers Association)
 </span>
 </label>

 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={profileFormData.member_nihbs}
 onChange={(e) =>
 setProfileFormData({ ...profileFormData, member_nihbs: e.target.checked })
 }
 className="w-4 h-4 text-forest-600 dark:text-indigo-600 border-border rounded focus:ring-forest-500 dark:focus:ring-emerald-500"
 />
 <span className="text-sm text-text-secondary">
 NIHBS (Native Irish Honey Bee Society)
 </span>
 </label>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-3 pt-4">
 <Button
 onClick={updateUserProfile}
 disabled={savingProfile}
 tone="success"
 className="disabled:cursor-not-allowed disabled:opacity-50"
 >
 {savingProfile ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
 Saving...
 </>
 ) : (
 <>
 <Save size={16} />
 Save Changes
 </>
 )}
 </Button>
 <Button
 onClick={handleCancelProfileEdit}
 disabled={savingProfile}
 tone="neutral"
 className="disabled:opacity-50"
 >
 Cancel
 </Button>
 </div>
 </div>
 ) : (
 /* Display Mode */
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex items-start gap-3 p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <User size={20} className="text-text-tertiary mt-1" />
 <div className="flex-1">
 <div className="text-sm font-medium text-text-secondary mb-1">First Name</div>
 <div className="text-foreground">
 {userProfile?.first_name || <span className="text-text-tertiary italic">Not set</span>}
 </div>
 </div>
 </div>

 <div className="flex items-start gap-3 p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <User size={20} className="text-text-tertiary mt-1" />
 <div className="flex-1">
 <div className="text-sm font-medium text-text-secondary mb-1">Last Name</div>
 <div className="text-foreground">
 {userProfile?.last_name || <span className="text-text-tertiary italic">Not set</span>}
 </div>
 </div>
 </div>

 <div className="md:col-span-2 flex items-start gap-3 p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <Phone size={20} className="text-text-tertiary mt-1" />
 <div className="flex-1">
 <div className="text-sm font-medium text-text-secondary mb-1">Mobile Number</div>
 <div className="text-foreground">
 {userProfile?.mobile_number || <span className="text-text-tertiary italic">Not set</span>}
 </div>
 </div>
 </div>

 <div className="md:col-span-2 p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <div className="text-sm font-medium text-text-secondary mb-1">Producer Address</div>
 <div className="text-foreground">
 {userProfile?.producer_address || <span className="text-text-tertiary italic">Not set</span>}
 </div>
 </div>

 <div className="p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <div className="text-sm font-medium text-text-secondary mb-1">Breeder Code</div>
 <div className="text-foreground font-mono">
 {userProfile?.breeder_code || <span className="font-sans text-text-tertiary italic">Not set</span>}
 </div>
 </div>

 {/* Location Display */}
 <div className="md:col-span-2 p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <div className="text-sm font-semibold text-foreground mb-1">Resident in NI/UK</div>
 <div className="text-sm text-foreground">{userProfile?.is_uk_ni_resident ? 'Yes' : 'No'}</div>
 </div>

 {/* Association Membership Display */}
 {(userProfile?.association_id || userProfile?.member_fibka || userProfile?.member_iba || userProfile?.member_nihbs) && (
 <div className="md:col-span-2 p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <div className="text-sm font-semibold text-foreground mb-2">Association Memberships</div>
 <div className="space-y-2">
 {userProfile?.association_id && (
 <div className="text-sm text-foreground">
 <span className="font-medium">Local Association:</span>{' '}
 {associations.find(a => a.id === userProfile.association_id)?.name || 'Unknown'}
 </div>
 )}
 {(userProfile?.member_fibka || userProfile?.member_iba || userProfile?.member_nihbs) && (
 <div className="text-sm text-foreground">
 <span className="font-medium">National Organizations:</span>{' '}
 {[
 userProfile?.member_fibka && 'FIBKA',
 userProfile?.member_iba && 'IBA',
 userProfile?.member_nihbs && 'NIHBS'
 ].filter(Boolean).join(', ')}
 </div>
 )}
 </div>
 </div>
 )}

 </div>
 </div>
 )}
 </div>

 {/* Manage Section */}
 <Panel>
 <div className="flex items-center gap-3 mb-4">
 <h2 className="text-xl font-semibold text-foreground">Manage</h2>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {[
 { href: '/dashboard/scales', label: 'Scales', description: 'BEEP & Wolf Waagen integrations', icon: Scale, colour: 'text-blue-600 dark:text-blue-400' },
 { href: '/dashboard/apiary-team', label: 'Apiary Team', description: 'Team-based apiary sharing', icon: Users, colour: 'text-green-600 dark:text-green-400' },
 { href: '/dashboard/rearing-team', label: 'Rearing Team', description: 'Queen rearing groups', icon: Crown, colour: 'text-amber-600 dark:text-amber-400' },
 ].map((item) => (
 <Link
 key={item.href}
 href={item.href}
 className="flex items-center gap-3 p-4 border border-border rounded-lg hover:border-forest-500 dark:hover:border-forest-400 hover:bg-forest-50 dark:hover:bg-forest-900/20 transition-colors"
 >
 <item.icon size={20} className={item.colour} />
 <div className="flex-1 min-w-0">
 <h3 className="font-medium text-foreground text-sm">{item.label}</h3>
 <p className="text-xs text-text-secondary truncate">{item.description}</p>
 </div>
 <ChevronRight size={16} className="text-text-tertiary flex-shrink-0" />
 </Link>
 ))}
 </div>
 </Panel>

 {/* Theme Preferences */}
 <Panel>
 <div className="flex items-center gap-3 mb-6">
 <Palette size={24} className="text-forest-600 dark:text-forest-400" />
 <h2 className="text-xl font-semibold text-foreground">Theme Preferences</h2>
 </div>
 <p className="text-sm text-text-secondary mb-4">
 Choose your preferred theme. Light mode is optimized for outdoor field work, while dark mode is ideal for evening planning.
 </p>
 <ThemeSwitcher />
 </Panel>

 {/* Subscription Management */}
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <Calendar size={28} className="text-amber-600" />
 <h2 className="text-2xl font-semibold text-foreground">Subscription</h2>
 </div>

 <SubscriptionStatusCard
 key={subscriptionRefreshKey}
 onRenewClick={() => setShowRenewSubscriptionModal(true)}
 />

 <SubscriptionHistoryTable key={subscriptionRefreshKey} />
 </div>

 {/* Data Export - Only visible for users with active subscription */}
 {subscriptionStatus?.is_active && (
 <Panel>
 <h2 className="text-xl font-semibold text-foreground mb-4">My Data Export</h2>
 <p className="text-sm text-text-tertiary mb-4">
 Export all your personal beekeeping data including apiaries, hives, queens, inspections, and varroa management records.
 </p>
 <ul className="text-sm text-text-tertiary space-y-1 mb-4">
 <li>• Includes all your personal beekeeping records</li>
 <li>• Choose between JSON or CSV format</li>
 <li>• Use for backup, analysis, or migration purposes</li>
 <li>• Only includes data you own and have created</li>
 </ul>
 <div className="flex gap-3">
 <Button
 onClick={exportMyDataAsJSON}
 disabled={exportingMyData}
 tone="success"
 className="disabled:cursor-not-allowed disabled:opacity-50"
 >
 {exportingMyData ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
 Exporting...
 </>
 ) : (
 <>
 <Download size={16} />
 Export as JSON
 </>
 )}
 </Button>
 <Button
 onClick={exportMyDataAsCSV}
 disabled={exportingMyData}
 tone="success"
 className="disabled:cursor-not-allowed disabled:opacity-50"
 >
 {exportingMyData ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
 Exporting...
 </>
 ) : (
 <>
 <Download size={16} />
 Export as CSV
 </>
 )}
 </Button>
 </div>
 </Panel>
 )}
 {/* Additional Settings */}
 <Panel>
 <h2 className="text-xl font-semibold text-foreground mb-4">Additional Settings</h2>
 <div className="space-y-3">
 <div className="flex items-center justify-between p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <div>
 <div className="font-medium text-foreground">Change Password</div>
 <div className="text-sm text-text-tertiary">Update your account password</div>
 </div>
 <Button
 onClick={() => setShowChangePasswordModal(true)}
 tone="success"
 size="sm"
 >
 Change Password
 </Button>
 </div>

 <div className="p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <div className="mb-4">
 <div className="font-medium text-foreground mb-1">Email Notifications</div>
 <div className="text-sm text-text-tertiary">Manage your email reminder preferences for tasks and events</div>
 </div>

 <div className="space-y-3">
 {/* Task Email Reminders Toggle */}
 <div className="flex items-center justify-between">
 <div>
 <label htmlFor="task-reminders" className="text-sm font-medium text-foreground">Task Reminders</label>
 <div className="text-xs text-text-tertiary">Receive email reminders for upcoming tasks</div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 id="task-reminders"
 checked={profileFormData.enable_task_email_reminders}
 onChange={async (e) => {
 const newValue = e.target.checked
 setProfileFormData(prev => ({
 ...prev,
 enable_task_email_reminders: newValue
 }))

 // Update database immediately with new value
 if (!userId) return
 try {
 const { error } = await supabase
 .from('profiles')
 .update({ enable_task_email_reminders: newValue })
 .eq('id', userId)

 if (error) throw error
 } catch (error) {
 console.error('Error updating task reminders:', error)
 toast.error('Could not save task-reminders setting. Please try again.')
 // Revert on error
 setProfileFormData(prev => ({
 ...prev,
 enable_task_email_reminders: !newValue
 }))
 }
 }}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-surface-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
 </label>
 </div>

 {/* Event Email Reminders Toggle */}
 <div className="flex items-center justify-between">
 <div>
 <label htmlFor="event-reminders" className="text-sm font-medium text-foreground">Event Reminders</label>
 <div className="text-xs text-text-tertiary">Receive email reminders for upcoming events</div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 id="event-reminders"
 checked={profileFormData.enable_event_email_reminders}
 onChange={async (e) => {
 const newValue = e.target.checked
 setProfileFormData(prev => ({
 ...prev,
 enable_event_email_reminders: newValue
 }))

 // Update database immediately with new value
 if (!userId) return
 try {
 const { error } = await supabase
 .from('profiles')
 .update({ enable_event_email_reminders: newValue })
 .eq('id', userId)

 if (error) throw error
 } catch (error) {
 console.error('Error updating event reminders:', error)
 toast.error('Could not save event-reminders setting. Please try again.')
 // Revert on error
 setProfileFormData(prev => ({
 ...prev,
 enable_event_email_reminders: !newValue
 }))
 }
 }}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-surface-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
 </label>
 </div>

 {/* Reminder Frequency Dropdown */}
 <div className="pt-2 border-t border-border">
 <label htmlFor="reminder-frequency" className="block text-sm font-medium text-foreground mb-2">
 Reminder Frequency
 </label>
 <select
 id="reminder-frequency"
 value={profileFormData.task_reminder_frequency}
 onChange={async (e) => {
 const newValue = e.target.value as 'realtime' | 'daily' | 'weekly' | 'disabled'
 const oldValue = profileFormData.task_reminder_frequency
 setProfileFormData(prev => ({
 ...prev,
 task_reminder_frequency: newValue
 }))

 // Update database immediately with new value
 if (!userId) return
 try {
 const { error } = await supabase
 .from('profiles')
 .update({ task_reminder_frequency: newValue })
 .eq('id', userId)

 if (error) throw error
 } catch (error) {
 console.error('Error updating reminder frequency:', error)
 toast.error('Could not save reminder frequency. Please try again.')
 // Revert on error
 setProfileFormData(prev => ({
 ...prev,
 task_reminder_frequency: oldValue
 }))
 }
 }}
 disabled={!profileFormData.enable_task_email_reminders && !profileFormData.enable_event_email_reminders}
 className="w-full px-3 py-2 bg-surface dark:bg-surface-elevated border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <option value="realtime">Realtime (Hourly check)</option>
 <option value="daily">Daily (Once per day)</option>
 <option value="weekly">Weekly (Once per week)</option>
 <option value="disabled">Disabled (No emails)</option>
 </select>
 <div className="mt-1 text-xs text-text-tertiary">
 {!profileFormData.enable_task_email_reminders && !profileFormData.enable_event_email_reminders ? (
 'Enable task or event reminders above to set frequency'
 ) : (
 <>
 {profileFormData.task_reminder_frequency === 'realtime' && 'Checks every hour for reminders in next 24 hours'}
 {profileFormData.task_reminder_frequency === 'daily' && 'Sends once per day for tasks/events in next 2 days'}
 {profileFormData.task_reminder_frequency === 'weekly' && 'Sends once per week for tasks/events in next 7 days'}
 {profileFormData.task_reminder_frequency === 'disabled' && 'No email reminders will be sent'}
 </>
 )}
 </div>
 </div>
 </div>
 </div>

 <div className="p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <div className="mb-4">
 <div className="font-medium text-foreground mb-1">Printing</div>
 <div className="text-sm text-text-tertiary">Print thermal labels for queens and bulk honey containers (Brother QL-820 / DK-22251).</div>
 </div>

 <div className="flex items-center justify-between">
 <div>
 <label htmlFor="label-printing" className="text-sm font-medium text-foreground">Enable label printing</label>
 <div className="text-xs text-text-tertiary">Adds print buttons in the Queens and Traceability sections</div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 id="label-printing"
 checked={profileFormData.enable_label_printing}
 onChange={async (e) => {
 const newValue = e.target.checked
 setProfileFormData(prev => ({
 ...prev,
 enable_label_printing: newValue
 }))

 if (!userId) return
 try {
 const { error } = await supabase
 .from('profiles')
 .update({ enable_label_printing: newValue })
 .eq('id', userId)

 if (error) throw error
 } catch (error) {
 console.error('Error updating label printing flag:', error)
 toast.error('Could not save the label-printing setting. Please try again.')
 setProfileFormData(prev => ({
 ...prev,
 enable_label_printing: !newValue
 }))
 }
 }}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-surface-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
 </label>
 </div>
 </div>
 </div>
 </Panel>

 {/* Danger Zone */}
 <Panel className="border border-red-300 dark:border-red-800">
 <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-4">Danger Zone</h2>
 <div className="flex items-center justify-between p-4 bg-surface dark:bg-surface-elevated rounded-lg border border-border">
 <div>
 <div className="font-medium text-red-900 dark:text-red-100">Delete Account</div>
 <div className="text-sm text-red-700 dark:text-red-300">Delete your account - data retained for 12 months</div>
 </div>
 <Button
 onClick={() => setShowDeleteAccountModal(true)}
 tone="danger"
 size="sm"
 >
 <Trash2 size={16} />
 Delete Account
 </Button>
 </div>
 </Panel>
 {/* Change Password Modal */}
 {showChangePasswordModal && (
 <ModalShell
 title="Change Password"
 titleClassName="text-xl"
 closeDisabled={changingPassword}
 onClose={() => {
 setShowChangePasswordModal(false)
 setCurrentPassword('')
 setNewPassword('')
 setConfirmPassword('')
 setPasswordError('')
 }}
 bodyClassName="p-6 space-y-4"
 footer={(
 <FormActionRow bordered padding="md">
 <Button
 onClick={() => {
 setShowChangePasswordModal(false)
 setCurrentPassword('')
 setNewPassword('')
 setConfirmPassword('')
 setPasswordError('')
 }}
 disabled={changingPassword}
 tone="neutral"
 className="flex-1 disabled:cursor-not-allowed disabled:opacity-50"
 >
 Cancel
 </Button>
 <Button
 onClick={handleChangePassword}
 disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
 tone="success"
 className="flex-1 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {changingPassword ? 'Changing...' : 'Change Password'}
 </Button>
 </FormActionRow>
 )}
 >
 {passwordError && (
 <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
 <p className="text-red-800 dark:text-red-200 text-sm">{passwordError}</p>
 </div>
 )}

 <div>
 <FieldLabel required>Current Password</FieldLabel>
 <TextInput
 type="password"
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 disabled={changingPassword}
 placeholder="Enter current password"
 />
 </div>

 <div>
 <FieldLabel required>New Password</FieldLabel>
 <TextInput
 type="password"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 disabled={changingPassword}
 placeholder="Enter new password (min 8 characters)"
 />
 </div>

 <div>
 <FieldLabel required>Confirm New Password</FieldLabel>
 <TextInput
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 disabled={changingPassword}
 placeholder="Confirm new password"
 />
 </div>

 <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
 <p className="text-blue-900 dark:text-blue-100 font-semibold text-sm mb-1">Password Requirements:</p>
 <ul className="list-disc pl-4 text-blue-800 dark:text-blue-200 text-xs space-y-1">
 <li>At least 8 characters long</li>
 <li>Different from your current password</li>
 <li>Both new password fields must match</li>
 </ul>
 </div>
 </ModalShell>
 )}

 {/* Delete Account Confirmation Modal */}
 {showDeleteAccountModal && (
 <ModalShell
 title={(
 <span className="inline-flex items-center gap-2">
 <Trash2 size={20} className="text-red-600" />
 Delete Account
 </span>
 )}
 titleClassName="text-red-900 dark:text-red-100"
 closeDisabled={deletingAccount}
 onClose={() => {
 setShowDeleteAccountModal(false)
 setDeleteConfirmText('')
 }}
 shellClassName="max-h-[85vh] flex flex-col"
 bodyClassName="flex-1 overflow-y-auto p-4 space-y-3"
 footer={(
 <FormActionRow bordered padding="sm" className="flex-shrink-0">
 <Button
 onClick={() => {
 setShowDeleteAccountModal(false)
 setDeleteConfirmText('')
 }}
 disabled={deletingAccount}
 tone="neutral"
 className="flex-1 disabled:cursor-not-allowed disabled:opacity-50"
 >
 Cancel
 </Button>
 <Button
 onClick={handleDeleteAccount}
 disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
 tone="danger"
 className="flex-1 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {deletingAccount ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
 Deleting Account...
 </>
 ) : (
 <>
 <Trash2 size={16} />
 Delete Account
 </>
 )}
 </Button>
 </FormActionRow>
 )}
 >
 <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
 <p className="text-blue-900 dark:text-blue-100 font-semibold text-sm mb-1.5">What Happens:</p>
 <ul className="list-disc pl-4 text-blue-800 dark:text-blue-200 text-xs space-y-1">
 <li>Account deactivated immediately</li>
 <li>Data retained for 12 months</li>
 <li>Reactivation available anytime</li>
 </ul>
 </div>

 <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
 <p className="text-red-900 dark:text-red-100 font-semibold text-sm mb-1.5">After 12 Months:</p>
 <p className="text-red-800 dark:text-red-200 text-xs">
 All data permanently deleted. Cannot be recovered.
 </p>
 </div>

 <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
 <p className="text-amber-900 dark:text-amber-100 font-semibold text-sm mb-1.5">Recommended:</p>
 <p className="text-amber-800 dark:text-amber-200 text-xs">
 Export your data first (JSON/CSV options above)
 </p>
 </div>

 <div className="pt-2">
 <FieldLabel className="text-xs mb-1.5">
 Type <span className="font-mono bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 text-xs">DELETE</span> to confirm:
 </FieldLabel>
 <TextInput
 type="text"
 value={deleteConfirmText}
 onChange={(e) => setDeleteConfirmText(e.target.value)}
 placeholder="Type DELETE here"
 disabled={deletingAccount}
 danger
 className="text-sm"
 autoComplete="off"
 />
 </div>
 </ModalShell>
 )}

 {/* Renew Subscription Modal */}
 <RenewSubscriptionModal
 isOpen={showRenewSubscriptionModal}
 onClose={() => setShowRenewSubscriptionModal(false)}
 onSuccess={() => {
 // Increment the key to force re-render of subscription components
 setSubscriptionRefreshKey(prev => prev + 1)
 setShowRenewSubscriptionModal(false)
 }}
 userId={userId || ''}
 />
 </div>
 )
}
