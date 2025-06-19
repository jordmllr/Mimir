#!/usr/bin/env python3
"""
Mimir SVG Icon Generator

Generates clean, minimalist SVG icons for the Mimir flashcard application.
Icons follow the paper theme aesthetic with simple geometric shapes and clean lines.

Usage:
    python svg_icons.py

This will generate all icons and save them to the 'icons' directory.
"""

from pathlib import Path
from typing import Dict, List


class MimirIconGenerator:
    """
    SVG icon generator for Mimir flashcard app.

    Follows the minimalist paper theme design language:
    - Clean geometric shapes
    - Simple lines and curves
    - Consistent stroke width
    - Muted color palette
    """

    def __init__(self, output_dir: str = "icons"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

        # Mimir design system colors (from paper theme)
        self.colors = {
            'background': '#faf8f5',
            'text': '#2c2c2c',
            'text_secondary': '#4a4a4a',
            'accent': '#3c3c3c',
            'border': 'rgba(60, 60, 60, 0.1)',
            'shadow': 'rgba(0, 0, 0, 0.1)',
            'error': '#8b4444',
            'success': '#4a6b4a'
        }

        # Standard icon dimensions and styling
        self.default_size = 24
        self.stroke_width = 1.5
        self.viewbox = "0 0 24 24"

    def create_svg_template(self, content: str, size: int = None, viewbox: str = None) -> str:
        """Create a complete SVG with the given content."""
        size = size or self.default_size
        viewbox = viewbox or self.viewbox

        return f'''<svg width="{size}" height="{size}" viewBox="{viewbox}"
             fill="none" stroke="currentColor" stroke-width="{self.stroke_width}"
             stroke-linecap="round" stroke-linejoin="round"
             xmlns="http://www.w3.org/2000/svg">
{content}
</svg>'''

    def stack_of_cards(self) -> str:
        """
        Generate a stack of cards icon.

        Design: Three overlapping rectangles with slight offsets to show depth,
        representing a stack of flashcards. Clean, minimal geometric approach.
        """
        content = '''    <!-- Bottom card (back layer) -->
    <rect x="4" y="6" width="14" height="10" rx="2"
          fill="none" stroke="currentColor" opacity="0.4"/>

    <!-- Middle card -->
    <rect x="3" y="5" width="14" height="10" rx="2"
          fill="none" stroke="currentColor" opacity="0.7"/>

    <!-- Top card (front layer) -->
    <rect x="2" y="4" width="14" height="10" rx="2"
          fill="none" stroke="currentColor"/>

    <!-- Optional: Small corner fold on top card to emphasize it's a card -->
    <path d="M14 4 L14 6 L16 4" stroke="currentColor" fill="none" opacity="0.6"/>'''

        return self.create_svg_template(content)

    def brain_outline(self) -> str:
        """
        Generate a brain outline icon for review/learning.
        Simple, geometric interpretation of a brain shape.
        """
        content = '''    <!-- Brain outline - simplified geometric approach -->
    <path d="M9.5 2C7.5 2 6 3.5 6 5.5c0 .5.1 1 .3 1.4C5.5 7.2 5 8 5 9c0 1.1.9 2 2 2h.5c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2h.5c1.1 0 2-.9 2-2 0-1-.5-1.8-1.3-2.1.2-.4.3-.9.3-1.4 0-2-1.5-3.5-3.5-3.5z"/>

    <!-- Brain texture lines -->
    <path d="M8 6c.5-.5 1-.5 1.5 0" stroke="currentColor" opacity="0.6"/>
    <path d="M10.5 8c.5-.3 1-.3 1.5 0" stroke="currentColor" opacity="0.6"/>
    <path d="M7.5 9c.3-.3.7-.3 1 0" stroke="currentColor" opacity="0.6"/>'''

        return self.create_svg_template(content)

    def plus_circle(self) -> str:
        """
        Generate a plus icon in a circle for create/add actions.
        """
        content = '''    <!-- Circle background -->
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"/>

    <!-- Plus sign -->
    <path d="M12 8v8M8 12h8" stroke="currentColor"/>'''

        return self.create_svg_template(content)

    def settings_gear(self) -> str:
        """
        Generate a settings gear icon.
        """
        content = '''    <!-- Gear outline -->
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor"/>

    <!-- Gear teeth -->
    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"
          stroke="currentColor" opacity="0.7"/>'''

        return self.create_svg_template(content)

    def book_open(self) -> str:
        """
        Generate an open book icon for study/review.
        """
        content = '''    <!-- Book pages -->
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="none" stroke="currentColor"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="none" stroke="currentColor"/>

    <!-- Book spine -->
    <path d="M12 7v14" stroke="currentColor" opacity="0.5"/>'''

        return self.create_svg_template(content)

    def generate_all_icons(self) -> Dict[str, str]:
        """Generate all icons and return a dictionary of filename -> SVG content."""
        icons = {
            'stack-of-cards.svg': self.stack_of_cards(),
            'brain-outline.svg': self.brain_outline(),
            'plus-circle.svg': self.plus_circle(),
            'settings-gear.svg': self.settings_gear(),
            'book-open.svg': self.book_open(),
        }

        return icons

    def save_icons(self) -> List[str]:
        """Generate and save all icons to the output directory."""
        icons = self.generate_all_icons()
        saved_files = []

        for filename, svg_content in icons.items():
            file_path = self.output_dir / filename
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(svg_content)
            saved_files.append(str(file_path))
            print(f"✓ Generated: {file_path}")

        return saved_files

    def preview_icon(self, icon_name: str) -> str:
        """Generate and return SVG content for a specific icon."""
        icons = self.generate_all_icons()
        filename = f"{icon_name}.svg"

        if filename in icons:
            return icons[filename]
        else:
            available = list(icons.keys())
            raise ValueError(f"Icon '{icon_name}' not found. Available: {available}")


def main():
    """Main function to generate all Mimir icons."""
    print("🎨 Mimir SVG Icon Generator")
    print("=" * 40)

    generator = MimirIconGenerator()

    print(f"📁 Output directory: {generator.output_dir}")
    print("🔧 Generating icons...")

    saved_files = generator.save_icons()

    print("\n✨ Generation complete!")
    print(f"📊 Generated {len(saved_files)} icons:")
    for file_path in saved_files:
        print(f"   • {Path(file_path).name}")

    print(f"\n💡 Icons saved to: {generator.output_dir}")
    print("🚀 Ready to use in your Mimir app!")


if __name__ == "__main__":
    main()