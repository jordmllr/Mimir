#!/usr/bin/env python3
"""
Test script for the Mimir SVG Icon Generator

Demonstrates how to use the MimirIconGenerator class programmatically.
"""

from svg_icons import MimirIconGenerator


def test_individual_icon():
    """Test generating a single icon."""
    print("🧪 Testing individual icon generation...")
    
    generator = MimirIconGenerator(output_dir="test_output")
    
    # Generate just the stack of cards icon
    stack_svg = generator.stack_of_cards()
    print("✓ Generated stack of cards SVG")
    print(f"📏 Length: {len(stack_svg)} characters")
    
    # Preview the first few lines
    lines = stack_svg.split('\n')
    print("📋 Preview:")
    for i, line in enumerate(lines[:5]):
        print(f"   {i+1}: {line}")
    if len(lines) > 5:
        print(f"   ... ({len(lines)-5} more lines)")


def test_preview_function():
    """Test the preview function."""
    print("\n🔍 Testing preview function...")
    
    generator = MimirIconGenerator()
    
    try:
        # Test valid icon
        brain_svg = generator.preview_icon("brain-outline")
        print("✓ Successfully previewed brain-outline icon")
        
        # Test invalid icon
        try:
            generator.preview_icon("nonexistent-icon")
        except ValueError as e:
            print(f"✓ Correctly handled invalid icon: {e}")
            
    except Exception as e:
        print(f"❌ Error in preview function: {e}")


def test_custom_output_dir():
    """Test generating icons to a custom directory."""
    print("\n📁 Testing custom output directory...")
    
    generator = MimirIconGenerator(output_dir="custom_icons")
    
    # Generate just a couple icons
    icons = {
        'test-stack.svg': generator.stack_of_cards(),
        'test-plus.svg': generator.plus_circle(),
    }
    
    saved_files = []
    for filename, svg_content in icons.items():
        file_path = generator.output_dir / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        saved_files.append(str(file_path))
        print(f"✓ Saved: {file_path}")
    
    return saved_files


def test_icon_properties():
    """Test that icons have expected properties."""
    print("\n🔧 Testing icon properties...")
    
    generator = MimirIconGenerator()
    
    # Test that all icons contain expected SVG elements
    icons = generator.generate_all_icons()
    
    for name, svg in icons.items():
        print(f"📊 Analyzing {name}:")
        
        # Check for SVG wrapper
        if '<svg' in svg and '</svg>' in svg:
            print("   ✓ Has SVG wrapper")
        else:
            print("   ❌ Missing SVG wrapper")
        
        # Check for viewBox
        if 'viewBox="0 0 24 24"' in svg:
            print("   ✓ Has correct viewBox")
        else:
            print("   ❌ Missing or incorrect viewBox")
        
        # Check for stroke properties
        if 'stroke="currentColor"' in svg:
            print("   ✓ Uses currentColor")
        else:
            print("   ❌ Missing currentColor")
        
        # Check for stroke-width
        if 'stroke-width="1.5"' in svg:
            print("   ✓ Has consistent stroke width")
        else:
            print("   ❌ Missing or inconsistent stroke width")


def main():
    """Run all tests."""
    print("🎨 Mimir Icon Generator Tests")
    print("=" * 50)
    
    test_individual_icon()
    test_preview_function()
    custom_files = test_custom_output_dir()
    test_icon_properties()
    
    print("\n✨ All tests completed!")
    print(f"🧹 Cleanup: You may want to remove test directories:")
    print("   - test_output/")
    print("   - custom_icons/")


if __name__ == "__main__":
    main()
