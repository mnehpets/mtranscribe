# Design: Transcript View

## Speaker Color Coding

To differentiate speakers visually, we will assign a unique color to each speaker name.

### Strategy
We will use a deterministic hashing approach to map a speaker's name to a specific color from a predefined palette. This ensures that the same speaker always gets the same color within a session without needing to store color preferences explicitly in the `Transcript` model.

### Palette
We will use a set of readable Tailwind text colors (e.g., `text-red-600`, `text-blue-600`, `text-green-600`, `text-purple-600`, `text-orange-600`, `text-teal-600`).

### Algorithm
```typescript
const colors = [
  'text-red-600',
  'text-blue-600',
  'text-green-600',
  'text-purple-600',
  'text-orange-600',
  'text-teal-600',
  // ...
];

function getSpeakerColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
```

## Component Structure

The `TranscriptView` component will be a simple presentational component.

- **Props**: `transcript: Transcript`
- **Template**:
  - **Header**:
    - `h1`: `transcript.title` (if present)
    - `details`: Collapsible section for `transcript.notes` (if present).
      - `summary`: "Notes"
      - Content: `transcript.notes`
  - **Turns Container**:
    - `v-for` loop over `transcript.turns`.
    - Each item: `<div> <span :class="speakerColor">SpeakerName</span>: {{ text }} </div>`

## Styling
- Minimalist design.
- Tailwind CSS classes.
- Bold speaker name.
- Title: Large font, bold.
- Notes: Standard text, inside a standard HTML `details`/`summary` element for native collapsibility.
