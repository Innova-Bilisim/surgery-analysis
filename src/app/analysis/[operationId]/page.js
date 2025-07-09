import AnalysisPage from '@/components/AnalysisPage'

export default async function AnalysisRoute({ params }) {
  const { operationId } = await params
  return <AnalysisPage operationId={operationId} />
}