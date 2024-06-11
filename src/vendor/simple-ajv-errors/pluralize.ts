// Simple replacement for the pluralize dependency.
export default function pluralize(word: string, count: number): string {
  if (count === 1) {
    return word
  }
  switch (word) {
    case 'property':
      return 'properties'
    default:
      return `${word}s`
  }
}
