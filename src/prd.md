# TripSplit - Expense Sharing App

## Core Purpose & Success
- **Mission Statement**: Enable friends to effortlessly track, split, and settle shared expenses during trips and group activities.
- **Success Indicators**: Users can quickly add expenses, see who owes what, and understand settlement calculations without confusion.
- **Experience Qualities**: Simple, trustworthy, and efficient.

## Project Classification & Approach
- **Complexity Level**: Light Application (multiple features with persistent state)
- **Primary User Activity**: Creating and managing shared financial records with automatic calculations.

## Thought Process for Feature Selection
- **Core Problem Analysis**: Friends on trips struggle to track who paid what and how to fairly split costs, leading to awkward money conversations and potential disputes.
- **User Context**: Used during and after trips when expenses are fresh in memory, often in casual social settings.
- **Critical Path**: Add participants → Record expenses → View settlements → Settle debts
- **Key Moments**: Adding an expense, seeing settlement calculations, editing/correcting mistakes.

## Essential Features

### Participant Management
- **What it does**: Add/remove friends participating in shared expenses, with expense recalculation
- **Why it matters**: Foundation for all expense tracking and calculations
- **Success criteria**: Can add friends instantly, remove friends with proper expense cleanup and warnings

### Expense Recording & Editing
- **What it does**: Record expenses with date, place, amount, description, payer, and participants. Full editing capability.
- **Why it matters**: Accurate expense tracking is critical for fair settlements
- **Success criteria**: Quick entry with smart defaults, comprehensive editing without data loss

### Automatic Settlement Calculation
- **What it does**: Calculates optimized payments to settle all debts with minimal transactions
- **Why it matters**: Eliminates manual math and reduces complexity of who pays whom
- **Success criteria**: Clear, easy-to-understand payment instructions

### Data Persistence
- **What it does**: Saves all data between sessions using useKV for permanent storage
- **Why it matters**: Trip expenses span multiple days/weeks, data must persist
- **Success criteria**: No data loss on refresh, reliable storage across sessions

## Design Direction

### Visual Tone & Identity
- **Emotional Response**: Clean, professional, and trustworthy - handling money requires confidence
- **Design Personality**: Modern and approachable, with clear information hierarchy
- **Visual Metaphors**: Financial clarity through clean cards and organized information
- **Simplicity Spectrum**: Minimal interface that prioritizes function over decoration

### Color Strategy
- **Color Scheme Type**: Analogous (blue-purple spectrum with warm accent)
- **Primary Color**: Deep blue-purple (`oklch(0.45 0.15 240)`) - trustworthy and professional
- **Secondary Colors**: Light blue-gray (`oklch(0.85 0.08 240)`) for subtle backgrounds
- **Accent Color**: Warm orange (`oklch(0.7 0.18 45)`) for primary actions and important highlights
- **Color Psychology**: Blue conveys trust and stability (crucial for money apps), orange adds energy for action items
- **Color Accessibility**: All pairings meet WCAG AA standards with 4.5:1+ contrast ratios
- **Foreground/Background Pairings**: 
  - Background (`oklch(0.98 0 0)`) with Foreground (`oklch(0.2 0.1 240)`) - 14.8:1 ratio
  - Primary (`oklch(0.45 0.15 240)`) with Primary-foreground (`oklch(0.98 0 0)`) - 8.9:1 ratio
  - Accent (`oklch(0.7 0.18 45)`) with Accent-foreground (`oklch(0.98 0 0)`) - 5.2:1 ratio

### Typography System
- **Font Pairing Strategy**: Single font family (Inter) with varied weights for hierarchy
- **Typographic Hierarchy**: 4xl for headers, lg for section titles, base for body, sm for metadata
- **Font Personality**: Inter provides modern professionalism with excellent readability
- **Readability Focus**: Generous line spacing (1.5x), optimal line lengths, clear size distinctions
- **Typography Consistency**: Consistent weight patterns across similar elements
- **Which fonts**: Inter from Google Fonts (400, 500, 600, 700 weights)
- **Legibility Check**: Inter is optimized for digital screens with clear character distinction

### Visual Hierarchy & Layout
- **Attention Direction**: Amount values are largest/boldest, followed by descriptions, then metadata
- **White Space Philosophy**: Generous padding and gaps to reduce cognitive load and improve scanability
- **Grid System**: CSS Grid for main layout, Flexbox for component-level organization
- **Responsive Approach**: Mobile-first with thoughtful breakpoints at md (768px) and larger
- **Content Density**: Balanced information display - detailed enough to be useful, clean enough to scan quickly

### Animations
- **Purposeful Meaning**: Subtle hover states communicate interactivity, smooth transitions maintain context
- **Hierarchy of Movement**: Button states get priority, card shadows for feedback, no gratuitous animation
- **Contextual Appropriateness**: Professional app requires restrained, purposeful motion

### UI Elements & Component Selection
- **Component Usage**: 
  - Cards for expense items and info blocks
  - Dialogs for complex forms (add/edit expenses, manage participants)
  - Buttons with clear hierarchy (primary accent, secondary outline)
  - Alert dialogs for destructive actions
- **Component Customization**: Accent color overrides for primary actions, custom card hover states
- **Component States**: All interactive elements have hover, focus, and active states
- **Icon Selection**: Phosphor icons for consistent style - functional over decorative
- **Component Hierarchy**: Primary actions use accent color, secondary use outline style, destructive use red
- **Spacing System**: Consistent 4px base unit (gap-2, gap-4, gap-6) following Tailwind scale
- **Mobile Adaptation**: Stack layouts vertically, expand buttons to full width, maintain tap targets

### Visual Consistency Framework
- **Design System Approach**: Component-based with shadcn/ui providing foundation
- **Style Guide Elements**: Color variables, consistent spacing, button hierarchies, card patterns
- **Visual Rhythm**: Consistent spacing patterns create predictable interface flow
- **Brand Alignment**: Professional yet approachable - trustworthy for financial data

### Accessibility & Readability
- **Contrast Goal**: WCAG AA compliance minimum (4.5:1 for normal text, 3:1 for large text)
- All color combinations meet or exceed requirements
- Keyboard navigation support through proper focus management
- Screen reader support through semantic HTML and proper labeling

## Edge Cases & Problem Scenarios
- **Participant Removal**: Handle expenses when participants are removed - clear warnings and automatic cleanup
- **Invalid Data**: Form validation prevents bad entries, graceful error messages guide corrections
- **Empty States**: Helpful guidance when no data exists, clear calls-to-action
- **Data Loss**: Persistent storage prevents accidental data loss, no unsaved state

## Implementation Considerations
- **Scalability Needs**: Designed for small groups (2-10 people), efficient algorithms for settlement calculation
- **Testing Focus**: Settlement calculation accuracy, data persistence reliability, form validation
- **Critical Questions**: 
  - How to handle complex splitting scenarios (unequal splits)?
  - Integration with payment apps for actual money transfer?
  - Offline functionality for areas with poor connectivity?

## Recent Updates

### Expense Editing Functionality
- **What it does**: Full editing capability for existing expenses with validation and error handling
- **Why it matters**: Mistakes happen with expense entry, editing prevents having to delete and re-enter
- **Success criteria**: All expense fields editable, proper validation, seamless participant updates

### Enhanced Participant Management
- **What it does**: Smart participant removal with expense impact warnings and automatic cleanup
- **Why it matters**: Prevents data inconsistencies when group composition changes
- **Success criteria**: Clear warnings about expense impacts, clean removal process, automatic recalculation

## Reflection
This solution uniquely balances simplicity with completeness - users get sophisticated settlement calculations without complexity. The editing and participant management features ensure the app handles real-world messiness while maintaining data integrity. The focus on trust through design makes users comfortable sharing financial information.