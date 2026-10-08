import { Star } from 'lucide-react'

/** Estrelas da avaliação média (frame desktop-02). */
export function RatingStars({ average }: { average: number }) {
  const label = `Avaliação média ${average.toFixed(1).replace('.', ',')} de 5`
  return (
    <span role="img" aria-label={label} className="flex gap-1 text-primary">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className="size-4" fill={average >= star - 0.25 ? 'currentColor' : 'none'} aria-hidden="true" />
      ))}
    </span>
  )
}
