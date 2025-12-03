import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReportsPage from '@/app/dashboard/reports/page'

// Mock the report components
vi.mock('@/components/reports/HiveHealthDashboard', () => ({
  default: () => <div data-testid="hive-health-dashboard">Hive Health Dashboard</div>
}))

vi.mock('@/components/reports/VarroaReport', () => ({
  default: () => <div data-testid="varroa-report">Varroa Report</div>
}))

vi.mock('@/components/reports/HarvestReport', () => ({
  default: () => <div data-testid="harvest-report">Harvest Report</div>
}))

vi.mock('@/components/reports/InspectionReport', () => ({
  default: () => <div data-testid="inspection-report">Inspection Report</div>
}))

describe('ReportsPage', () => {
  it('should render the reports page title', () => {
    render(<ReportsPage />)
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('Analyze your beekeeping data with comprehensive reports')).toBeInTheDocument()
  })

  it('should display all four report options', () => {
    render(<ReportsPage />)

    expect(screen.getByText('Hive Health Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Varroa Management')).toBeInTheDocument()
    expect(screen.getByText('Harvest & Productivity')).toBeInTheDocument()
    expect(screen.getByText('Inspection Summary')).toBeInTheDocument()
  })

  it('should show hive health dashboard when clicked', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    const hiveHealthButton = screen.getByRole('button', { name: /hive health dashboard/i })
    await user.click(hiveHealthButton)

    await waitFor(() => {
      expect(screen.getByTestId('hive-health-dashboard')).toBeInTheDocument()
    })
  })

  it('should show varroa report when clicked', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    const varroaButton = screen.getByRole('button', { name: /varroa management/i })
    await user.click(varroaButton)

    await waitFor(() => {
      expect(screen.getByTestId('varroa-report')).toBeInTheDocument()
    })
  })

  it('should show harvest report when clicked', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    const harvestButton = screen.getByRole('button', { name: /harvest & productivity/i })
    await user.click(harvestButton)

    await waitFor(() => {
      expect(screen.getByTestId('harvest-report')).toBeInTheDocument()
    })
  })

  it('should show inspection report when clicked', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    const inspectionButton = screen.getByRole('button', { name: /inspection summary/i })
    await user.click(inspectionButton)

    await waitFor(() => {
      expect(screen.getByTestId('inspection-report')).toBeInTheDocument()
    })
  })

  it('should return to report selection when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    // Click on a report
    const hiveHealthButton = screen.getByRole('button', { name: /hive health dashboard/i })
    await user.click(hiveHealthButton)

    await waitFor(() => {
      expect(screen.getByTestId('hive-health-dashboard')).toBeInTheDocument()
    })

    // Click back button
    const backButton = screen.getByRole('button', { name: /back to reports/i })
    await user.click(backButton)

    await waitFor(() => {
      expect(screen.queryByTestId('hive-health-dashboard')).not.toBeInTheDocument()
      expect(screen.getByText('Hive Health Dashboard')).toBeInTheDocument()
    })
  })

  it('should hide report selection grid when a report is selected', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    const hiveHealthButton = screen.getByRole('button', { name: /hive health dashboard/i })

    // Initially all reports should be visible
    expect(screen.getByText('Varroa Management')).toBeInTheDocument()

    await user.click(hiveHealthButton)

    await waitFor(() => {
      // Other report options should not be visible
      expect(screen.queryByText('Varroa Management')).not.toBeInTheDocument()
    })
  })
})
