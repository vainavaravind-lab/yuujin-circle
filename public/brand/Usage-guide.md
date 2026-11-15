# Yuujin Circle — First hello
## Idea
Two people meet through chance. The upright front die and the 45-degree rear die preserve the interaction already used in the app.

## Artwork
masters/ contains color, black, white, reversed and small-size symbols; horizontal and stacked lockups; and the outlined wordmark. SVG artwork is fully vector, with real transparent cutouts, no live text, effects or raster images. png/ contains transparent 1024px symbols. web/ contains the browser and app icons.

## Color
Ink: #30243C / RGB 48, 36, 60.
Sage: #819B86 / RGB 129, 155, 134.
Ivory: #F5F0E6 / RGB 245, 240, 230.
On dark ink, use the reversed symbol with light sage #B9CBB4.
Sage is a logo accent, not a small-text color on ivory. Print colors should be proofed with the printer's ICC profile; no Pantone equivalence is asserted.

## Sizes and clear space
Use the small-size drawing at 16–24px. Prefer the standard mark at 32px and above.
Keep at least one front pip diameter (28 units on the 256-unit symbol) clear around the visible mark.
Keep horizontal lockups at least 160px wide; use the symbol alone when space is tighter.
The app-icon drawing is padded for platform cropping; maskable-512.png uses a separate safe-area layout.

## Typography
Plus Jakarta Sans Semibold, already used by the website, is outlined in the delivered lockups.
The source font and its SIL Open Font License are included under source/. No installed font is required to display the SVG files.

## Usage
Use color on light paper, reversed on dark ink, or black/white for single-color printing.
Keep the rear die at 45 degrees. Do not stretch, add outlines, fill the pip cutouts, or add shadows and gradients to the logo.
The interactive dice may move in the application; the identity artwork itself stays static.

## Verification and limits
SVG geometry audits passed for the standard and small-size marks. The mark was rendered and inspected at 16, 24, 32, 48, 64 and 1024px and on light/dark backgrounds.
PNG dimensions, alpha and ICO sizes were checked. Website changes passed the TypeScript production build.
This is original artwork, not a claim of trademark clearance; no legal clearance search was performed.
