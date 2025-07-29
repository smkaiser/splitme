# Expense Sharing App for Trip Friends

A collaborative expense tracking tool that makes splitting costs on group trips effortless and transparent.

**Experience Qualities**:
1. **Trustworthy** - Clear, accurate calculations that everyone can verify and trust
2. **Effortless** - Quick expense entry without complicated forms or processes  
3. **Social** - Encourages group participation and maintains friendship harmony

**Complexity Level**: Light Application (multiple features with basic state)
- Multiple interconnected features (expense tracking, participant management, settlement calculations) with persistent state management, but no user accounts or complex backend systems required.

## Essential Features

### Add New Expense
- **Functionality**: Record shared expenses with date, location, amount, description, and participant selection
- **Purpose**: Capture all necessary information for accurate cost splitting
- **Trigger**: User clicks "Add Expense" button
- **Progression**: Click Add → Fill expense details → Select participants → Save → View in expense list
- **Success criteria**: Expense appears in list with correct details and calculated splits

### Participant Management  
- **Functionality**: Add/remove friends who can participate in shared expenses
- **Purpose**: Maintain a roster of trip companions for easy expense assignment
- **Trigger**: User accesses participant management from main interface
- **Progression**: Add participant → Enter name → Save → Participant available for expense selection
- **Success criteria**: Participants appear in expense form and can be selected/deselected

### Expense Overview
- **Functionality**: Display all recorded expenses with summary calculations
- **Purpose**: Provide transparency and overview of all group spending
- **Trigger**: Default view when app loads
- **Progression**: App loads → Shows expense list → Click expense → View details
- **Success criteria**: All expenses visible with clear cost breakdown per person

### Settlement Calculator
- **Functionality**: Calculate who owes whom and how much based on all expenses
- **Purpose**: Simplify the complex math of group expense settling
- **Trigger**: User views settlement summary section
- **Progression**: View settlements → See simplified debts → Understand payment flows
- **Success criteria**: Clear display of net amounts owed between participants

## Edge Case Handling

- **No Participants Selected**: Show validation error requiring at least one participant selection
- **Invalid Amount**: Reject non-numeric or negative amounts with clear error messaging
- **Empty Expense List**: Display helpful empty state encouraging users to add their first expense
- **Single Participant**: Allow single-person expenses but clearly indicate no splitting needed
- **Participant Deletion**: Warn if deleting participant who has existing expenses

## Design Direction

The design should feel trustworthy and collaborative, like a shared notebook that friends would use to track expenses together - clean, organized, and social without being overly casual. Minimal interface that prioritizes clarity and quick data entry over rich visual elements.

## Color Selection

Complementary (opposite colors) - Using a warm, friendly orange paired with cool, trustworthy blue to balance social warmth with financial reliability.

- **Primary Color**: Deep Blue (oklch(0.45 0.15 240)) - Communicates trust and reliability for financial data
- **Secondary Colors**: Light Blue (oklch(0.85 0.08 240)) for backgrounds and Neutral Gray (oklch(0.7 0 0)) for supporting text
- **Accent Color**: Warm Orange (oklch(0.7 0.18 45)) - Friendly call-to-action color for adding expenses and important interactions
- **Foreground/Background Pairings**: 
  - Background White (oklch(0.98 0 0)): Dark Blue text (oklch(0.2 0.1 240)) - Ratio 12.1:1 ✓
  - Primary Blue (oklch(0.45 0.15 240)): White text (oklch(0.98 0 0)) - Ratio 8.2:1 ✓
  - Accent Orange (oklch(0.7 0.18 45)): White text (oklch(0.98 0 0)) - Ratio 4.9:1 ✓
  - Card Light Blue (oklch(0.95 0.02 240)): Dark Blue text (oklch(0.2 0.1 240)) - Ratio 11.8:1 ✓

## Font Selection

Clean, numerical-friendly typeface that maintains readability for both currency amounts and casual descriptions - Inter provides excellent number legibility while feeling approachable for social interactions.

- **Typographic Hierarchy**: 
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing
  - H3 (Expense Titles): Inter Medium/18px/normal spacing  
  - Body (Descriptions): Inter Regular/16px/relaxed line height
  - Numbers (Amounts): Inter Medium/16px/tabular figures for alignment
  - Small (Meta info): Inter Regular/14px/muted color

## Animations

Subtle functionality-focused animations that provide feedback during expense entry and settlement calculations, with gentle transitions that feel collaborative rather than flashy.

- **Purposeful Meaning**: Smooth transitions between expense entry states reinforce successful data capture, while settlement calculations animate to show the "magic" of automatic splitting
- **Hierarchy of Movement**: Expense addition gets subtle celebration animation, settlement updates get gentle emphasis, navigation remains minimal and fast

## Component Selection

- **Components**: 
  - Cards for expense items and settlement summaries
  - Dialog for expense entry form
  - Select for participant choosing  
  - Input for amounts with proper number formatting
  - Button variants for primary (add expense) vs secondary (edit/delete) actions
  - Badge components for participant indicators
  
- **Customizations**: 
  - Currency input component with proper formatting and validation
  - Participant selector with visual checkboxes and clear selection state
  - Settlement visualization showing simplified debt relationships
  
- **States**: 
  - Buttons: Clear hover states with color shifts, disabled states for invalid forms
  - Inputs: Focus states with accent color, error states with destructive color
  - Cards: Subtle hover lift for interactive expense items
  
- **Icon Selection**: 
  - Plus icon for adding expenses and participants
  - Receipt icon for expense entries
  - Users icon for participant management
  - Calculator icon for settlements
  - Edit/Trash icons for expense management
  
- **Spacing**: Consistent 16px base spacing unit, generous padding on cards (24px), tight spacing for related form elements (8px)

- **Mobile**: 
  - Stack form fields vertically with full-width inputs
  - Larger touch targets for participant selection (48px minimum)
  - Collapsible sections for expense details
  - Bottom sheet style for expense entry on mobile screens
  - Single column layout for expense list with clear visual hierarchy