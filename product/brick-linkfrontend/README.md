# Brick-Kit - AI LEGO Prompt Builder

An aesthetic web application that generates 3D LEGO models from text prompts using AI. Built with Next.js, React Three Fiber, and the LDraw file format for authentic LEGO visualization.

## Overview

Brick-Kit provides a beautiful, minimalist interface where users can describe what they want to build, and the application displays the resulting LEGO model in an interactive 3D viewer. The interface features a black grid background reminiscent of LEGO building plates, with a sleek cream-colored input panel inspired by modern AI interfaces.

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **UI Library**: React 19.1.0
- **3D Rendering**: Three.js 0.180.0 with React Three Fiber 9.4.0
- **3D Controls**: @react-three/drei 10.7.6
- **Styling**: Tailwind CSS v4.1.9
- **Component Library**: shadcn/ui with Radix UI primitives
- **Icons**: Lucide React
- **Fonts**: Geist & Geist Mono (via next/font)
- **TypeScript**: v5

## Project Structure

\`\`\`
brick-kit/
├── app/
│   ├── page.tsx              # Home page (renders LegoBuilder)
│   ├── layout.tsx            # Root layout with fonts and metadata
│   └── globals.css           # Global styles and design tokens
├── components/
│   ├── lego-builder.tsx      # Main UI component with state management
│   ├── ldraw-viewer.tsx      # 3D LDraw model viewer component
│   └── ui/                   # shadcn/ui components (button, card, etc.)
├── public/
│   ├── images/
│   │   └── lego-minifig.png  # LEGO spaceman mascot image
│   └── ldraw/                # LDraw parts library (YOU NEED TO ADD THIS)
│       ├── parts/            # Individual LEGO part files
│       └── p/                # Primitive part files
├── hooks/                    # Custom React hooks
├── lib/
│   └── utils.ts              # Utility functions (cn for classnames)
└── package.json              # Dependencies and scripts
\`\`\`

## Key Features

### 1. **Aesthetic Landing Page**
- Black background with white grid lines (40px spacing)
- "let your imagination run wild" tagline
- LEGO spaceman mascot
- Frosted glass input panel with cream/transparent aesthetic

### 2. **Interactive Prompt Input**
- Clean, minimal input field with "Build anything" placeholder
- Arrow button for submission
- Smooth transitions when building starts

### 3. **3D Model Viewer**
- Uses Three.js LDrawLoader to parse .mpd/.ldr LEGO files
- Interactive OrbitControls for rotating and zooming
- Automatic model centering and scaling
- Proper lighting for LEGO-like appearance
- Loading state with "generating bricks" message

### 4. **State Transitions**
- Grid zooms in (2.5x) when building starts
- Input panel shrinks and moves to bottom-right
- Shows "kit is cooking your: [prompt]" during generation
- Smooth CSS transitions throughout

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Git

### Installation

1. **Clone the repository**
\`\`\`bash
git clone <your-repo-url>
cd brick-kit
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

3. **Download the LDraw Parts Library** (CRITICAL STEP)

The LDraw viewer requires the official LDraw parts library to render LEGO models correctly. Without this, models will fail to load.

**Option A: Download from LDraw.org**
\`\`\`bash
# Download the complete library from https://www.ldraw.org/library/updates/complete.zip
# Extract it and place the contents in public/ldraw/

# Your structure should look like:
# public/ldraw/parts/
# public/ldraw/p/
# public/ldraw/models/ (optional)
\`\`\`

**Option B: Use a minimal parts library**
If you only need specific parts, you can download individual part files from the LDraw Parts Tracker (https://www.ldraw.org/cgi-bin/ptlist.cgi) and place them in the appropriate directories.

4. **Add your LEGO minifigure image**
Place your `lego-minifig.png` in `public/images/` (or the image is already there from the project).

5. **Run the development server**
\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

### Frontend Flow

1. **Initial State**: User sees the landing page with the grid background, tagline, LEGO mascot, and input panel.

2. **User Input**: User types a prompt (e.g., "red race car") and presses Enter.

3. **Building State**: 
   - Grid zooms in with smooth animation
   - Landing content fades out
   - Loading spinner appears with "generating bricks" text
   - Input panel shrinks and moves to bottom-right

4. **Model Display**: 
   - Backend provides a .mpd file URL
   - LDrawViewer component loads the file using Three.js LDrawLoader
   - Model is centered, scaled, and rendered in 3D
   - User can rotate/zoom with mouse controls

### LDraw Integration

The `ldraw-viewer.tsx` component:
- Fetches the .mpd file from the provided URL
- Validates it's not an HTML error page
- Creates a blob URL for the LDrawLoader
- Configures the loader with:
  - `setPath()` - Points to the LDraw library base URL
  - `setConditionalLineMaterial()` - Sets line rendering material
  - `preloadMaterials(true)` - Enables LEGO-like material appearance
- Loads the model and adds it to the Three.js scene
- Centers and scales the model to fit the viewport
- Provides OrbitControls for user interaction

### Backend Integration (To Be Implemented)

Currently, the app uses a test .mpd file URL. To integrate with your AI backend:

1. **Update `lego-builder.tsx`**:
\`\`\`typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (prompt.trim()) {
    setUserRequest(prompt)
    setIsBuilding(true)
    
    try {
      // Call your AI backend API
      const response = await fetch('/api/generate-lego', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      })
      
      const data = await response.json()
      setModelUrl(data.modelUrl) // URL to the generated .mpd file
    } catch (error) {
      console.error('Error generating model:', error)
      // Handle error state
    }
  }
}
\`\`\`

2. **Backend Requirements**:
   - Accept text prompts via API
   - Generate or retrieve LEGO models (as .mpd or .ldr files)
   - Return a publicly accessible URL to the model file
   - Ensure CORS is enabled for the model file URLs

## Environment Variables

If using Vercel Blob storage or other services:

\`\`\`env
# Vercel Blob (already configured in your project)
BLOB_READ_WRITE_TOKEN=your_token_here

# Supabase (if using for model storage)
SUPABASE_POSTGRES_URL=your_url_here
SUPABASE_SUPABASE_NEXT_PUBLIC_SUPABASE_URL=your_url_here
SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY_ANON_KEY=your_key_here
\`\`\`

## Design System

### Colors
- **Background**: Deep black (`oklch(0.1 0 0)`)
- **Foreground**: Off-white (`oklch(0.98 0 0)`)
- **Card/Panel**: Cream white (`oklch(0.95 0.005 85)`)
- **Grid Lines**: Dark gray (`oklch(0.35 0 0)`)

### Typography
- **Headings**: Geist Sans, light weight (300)
- **Body**: Geist Sans, normal weight (400)
- **Monospace**: Geist Mono (for logo)

### Spacing
- Grid: 40px × 40px
- Border radius: 1.25rem (20px) for modern, rounded look
- Padding: Consistent use of Tailwind spacing scale

## Troubleshooting

### "ConditionalLineMaterial must be specified" Error
- Ensure `setConditionalLineMaterial()` is called before loading models
- Verify Three.js version matches (0.180.0)

### "Unknown line type <!DOCTYPE" Error
- The .mpd file URL is returning HTML instead of the model file
- Check CORS settings on your file storage
- Verify the URL is publicly accessible
- Ensure the file is actually a .mpd/.ldr file, not an error page

### Model Not Displaying
- Verify the LDraw parts library is in `public/ldraw/`
- Check browser console for loading errors
- Ensure the .mpd file references parts that exist in your library
- Try with a packed .mpd file (contains all parts inline)

### Grid Not Visible
- Check that `globals.css` has the `.grid-background` class
- Verify CSS custom properties are defined in `:root`
- Ensure Tailwind CSS is properly configured

## Development

### Available Scripts

\`\`\`bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
\`\`\`

### Adding New Components

This project uses shadcn/ui. To add new components:

\`\`\`bash
npx shadcn@latest add [component-name]
\`\`\`

## Production Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

**Important**: The LDraw library folder (`public/ldraw/`) can be large (100MB+). Consider:
- Using a CDN for the parts library
- Hosting parts separately and updating `loader.setPath()`
- Using packed .mpd files that don't require external parts

### Other Platforms
Ensure your hosting platform:
- Supports Next.js 15+ (App Router)
- Can serve static files from `public/`
- Has sufficient storage for the LDraw library

## Future Enhancements

- [ ] Backend AI integration for prompt-to-model generation
- [ ] Step-by-step building instructions viewer
- [ ] Model export/download functionality
- [ ] Gallery of previously generated models
- [ ] User authentication and saved builds
- [ ] Social sharing features
- [ ] Mobile-optimized 3D controls

## License

[Your License Here]

## Credits

- LDraw file format: https://www.ldraw.org/
- Three.js LDrawLoader: https://threejs.org/
- shadcn/ui: https://ui.shadcn.com/
- Geist fonts: Vercel

---

Built with ❤️ using v0 by Vercel
