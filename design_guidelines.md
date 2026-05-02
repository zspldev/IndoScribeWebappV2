# InDict - Design Guidelines

## Design Approach

**Classification:** Utility-Focused Web Application
**Strategy:** Clean, functional design system with emphasis on clarity and accessibility for multilingual content

This is a productivity tool, not a marketing site. The design prioritizes efficient workflow, clear visual hierarchy, and excellent support for Indian language scripts (Devanagari and Latin).

## Core Design Principles

1. **Clarity First:** Every UI element serves a clear purpose in the transcription workflow
2. **Script Excellence:** Typography must render Indian scripts beautifully and readably
3. **Progressive Disclosure:** Show relevant UI sections as the user progresses through steps
4. **Visual Feedback:** Clear loading states, success confirmations, and error messages

## Layout System

**Container Structure:**
- Maximum width: `max-w-4xl` (896px) for main content
- Centered layout with horizontal padding: `px-4 md:px-6`
- Vertical spacing rhythm: Use consistent `py-8` for section separation

**Spacing Primitives:**
- Primary units: `2, 4, 6, 8` for micro-spacing (padding, gaps)
- Section spacing: `8, 12, 16` for macro-spacing
- Example: `p-6`, `gap-4`, `my-8`, `space-y-6`

**Grid System:**
- Single column layout for main workflow
- Two-column grid for action buttons: `grid grid-cols-2 gap-4`

## Typography

**Font Families:**
- Headers & UI: `font-sans` (System fonts: -apple-system, SF Pro, Segoe UI)
- Indian Scripts: Embed Noto Sans Devanagari via Google Fonts CDN for Hindi/Marathi content
- Monospace: Not needed for this application

**Type Scale:**
- Page Title: `text-3xl md:text-4xl font-bold` 
- Section Headers: `text-xl md:text-2xl font-semibold`
- Card Titles: `text-lg font-medium`
- Body Text: `text-base` (16px)
- Helper Text: `text-sm text-gray-600`
- Editor Text: `text-lg` (larger for better readability of scripts)

**Text Hierarchy:**
- Primary actions use bolder weights (`font-semibold`, `font-bold`)
- Secondary information uses regular weight
- Disabled/inactive states use `text-gray-400`

## Color Palette

**Primary Colors:**
- Primary Action: `bg-indigo-600 hover:bg-indigo-700` (Indigo)
- Secondary Action: `bg-teal-600 hover:bg-teal-700` (Teal)
- Success States: `bg-green-600` 
- Error States: `bg-red-600`
- Warning States: `bg-amber-500`

**Neutrals:**
- Background: `bg-gray-50`
- Card Background: `bg-white`
- Borders: `border-gray-200`
- Text Primary: `text-gray-900`
- Text Secondary: `text-gray-600`
- Text Muted: `text-gray-400`

**Application:**
- Use primary (Indigo) for main CTA: "Start Transcription", "Download DOCX"
- Use secondary (Teal) for supporting actions if needed
- Maintain consistent color usage throughout the app

## Component Library

### Header
- Fixed height: `h-16`
- Contains logo/app name on left: "InDict" with tagline
- Clean separation with subtle border: `border-b border-gray-200`
- Background: `bg-white`

### Main Content Card
- White background with subtle shadow: `bg-white shadow-sm rounded-lg`
- Padding: `p-6 md:p-8`
- Border: `border border-gray-200`

### Language Dropdown
- Full-width select: `w-full md:w-64`
- Height: `h-11`
- Border: `border-gray-300 rounded-md`
- Focus state: `focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`

### File Upload Zone
- Drag-and-drop area with dashed border: `border-2 border-dashed border-gray-300`
- Rounded corners: `rounded-lg`
- Padding: `p-12`
- Hover state: `hover:border-indigo-400 hover:bg-indigo-50/50`
- Center-aligned icon and text
- Icon size: `w-12 h-12` (use file upload icon)

### Primary Buttons
- Height: `h-11 px-6`
- Rounded: `rounded-md`
- Font: `font-medium text-base`
- Background: `bg-indigo-600 hover:bg-indigo-700`
- Text: `text-white`
- Transition: `transition-colors`
- Add icon before text where relevant (download icon, etc.)

### Text Editor
- Border: `border border-gray-300 rounded-md`
- Padding: `p-4`
- Min height: `min-h-[300px]`
- Font size: `text-lg` for better script visibility
- Background: `bg-white`
- Focus state: `focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`
- Character/word count below editor: `text-sm text-gray-600`

### Loading States
- Spinner: Indigo-colored, centered
- Loading text: `text-gray-600` below spinner
- Use during: file upload, transcription processing

### Success Messages
- Background: `bg-green-50 border-l-4 border-green-500`
- Icon: Green checkmark
- Text: `text-green-800`
- Padding: `p-4`

### Error Messages  
- Background: `bg-red-50 border-l-4 border-red-500`
- Icon: Red warning/alert icon
- Text: `text-red-800`
- Padding: `p-4`
- Clear, actionable message text

### Step Indicators
- Use numbered steps with labels: "Step 1: Select Language", "Step 2: Upload Audio", etc.
- Number circles: `w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-semibold`
- Active step: `bg-indigo-600 text-white`
- Completed step: `bg-green-500 text-white` with checkmark

## Workflow-Specific Guidelines

### Progressive UI Display
1. **Initial State:** Show language selector + upload zone
2. **After Upload:** Show transcription button + file info (filename, duration)
3. **During Transcription:** Show loading spinner with "Transcribing your audio..."
4. **After Transcription:** Show text editor with transcribed content + download button
5. **After Download:** Show success message

### Indian Script Support
- Ensure Noto Sans Devanagari loads before displaying Hindi/Marathi text
- Text direction: LTR for all supported languages
- Line height: `leading-relaxed` (1.625) for better script readability
- Adequate letter spacing for Devanagari: `tracking-normal`

## Accessibility

- All form inputs have visible labels
- Buttons have clear, descriptive text (avoid icon-only buttons)
- Color contrast ratio: Minimum 4.5:1 for text
- Focus states clearly visible with ring style
- File upload zone keyboard accessible
- Error messages associated with relevant inputs

## Responsive Behavior

**Mobile (< 768px):**
- Full-width components
- Reduced padding: `p-4` instead of `p-8`
- Smaller text sizes for headers
- Stack elements vertically

**Desktop (≥ 768px):**
- Max-width containers
- Larger padding and spacing
- Comfortable reading widths for text content

## Animations

**Minimal, Purposeful Motion:**
- Transitions: `transition-colors duration-200` for button hovers
- Fade in for success/error messages: Simple opacity transition
- No complex animations or scroll effects
- Focus on instant feedback, not decorative motion

## Icons

**Library:** Heroicons (outline style for most, solid for active states)
**CDN:** Include via `<script src="https://unpkg.com/@heroicons/react@2.0.0/outline"></script>`

**Required Icons:**
- Upload: `CloudArrowUpIcon`
- Document: `DocumentTextIcon`  
- Download: `ArrowDownTrayIcon`
- Checkmark: `CheckCircleIcon`
- Error: `ExclamationCircleIcon`
- Loading: Use SVG spinner (not from icon library)

**Size:** `w-5 h-5` for button icons, `w-12 h-12` for upload zone icon

## Images

**No images required** for this utility application. The interface is purely functional with icons and text.