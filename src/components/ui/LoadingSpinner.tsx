export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-lg text-gray-600">{text}</div>
    </div>
  )
}