import { TripDetailsView } from '@/app/(dashboard)/trips/trip-details-view'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function TripDetailsPage({
  params,
}: Props) {
  const { id } = await params

  return <TripDetailsView tripId={id} />
}
