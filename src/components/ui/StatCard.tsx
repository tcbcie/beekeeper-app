interface StatCardProps {
  label: string
  value: number
  icon: string
  color: string
}

export default function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        </div>
        <div className={`text-4xl ${color} w-16 h-16 rounded-full flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}