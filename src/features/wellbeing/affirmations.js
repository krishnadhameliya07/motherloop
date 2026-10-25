// Affirmations carried over from Fourth Trimester (Bloom), de-duplicated.

export const AFFIRMATIONS = [
  'You are exactly the mother your baby needs.',
  "Be gentle with yourself; you're doing something incredible.",
  "It's okay to ask for help; it's a sign of strength, not weakness.",
  'Your worth is not measured by how much you get done today.',
  'Rest is productive. Your body and mind deserve it.',
  'You are doing a great job, even on the hardest days.',
  'Small wins are still wins. Celebrate them.',
  'Your baby loves you for who you are, through every mood.',
  "You're learning and growing alongside your baby.",
  "It's okay to take it one hour at a time.",
  'This season is temporary. Your strength is lasting.',
  'Taking care of yourself is part of taking care of your baby.',
]

export function randomAffirmationIndex() {
  return Math.floor(Math.random() * AFFIRMATIONS.length)
}
