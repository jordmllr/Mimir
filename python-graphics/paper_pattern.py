import numpy as np
from PIL import Image, ImageFilter
import os

def generate_paper_noise(width=512, height=512, intensity=0.15, grain_size=0.5):
    """
    Generate a fine paper texture noise pattern for matte finish.

    Args:
        width, height: Dimensions of the texture
        intensity: How strong the noise effect is (0.0 to 1.0)
        grain_size: Size of the paper grain (0.1-2.0, smaller = finer)
    """
    # Create base high-resolution noise for fine grain
    noise = np.random.random((height, width))

    # Create multiple octaves of noise with finer detail
    for octave in range(4):  # More octaves for finer detail
        scale = 2 ** octave
        if height // scale > 0 and width // scale > 0:
            octave_noise = np.random.random((height // scale, width // scale))
            octave_noise = np.repeat(np.repeat(octave_noise, scale, axis=0), scale, axis=1)

            # Trim to match original dimensions if needed
            octave_noise = octave_noise[:height, :width]

            # Add this octave with decreasing intensity (more subtle)
            noise += octave_noise * (0.3 ** octave)  # Reduced from 0.5 to 0.3

    # Normalize to 0-1 range
    noise = (noise - noise.min()) / (noise.max() - noise.min())

    # Apply intensity scaling - center around 0.5 (neutral) with much subtler effect
    noise = 0.5 + (noise - 0.5) * intensity

    # Convert to 8-bit grayscale
    noise_8bit = (noise * 255).astype(np.uint8)

    # Create PIL image
    img = Image.fromarray(noise_8bit, mode='L')

    # Apply very slight blur for ultra-fine paper grain
    if grain_size > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=grain_size))

    return img

def save_paper_texture(filename='paper_texture.png', size=(512, 512), intensity=0.12):
    """
    Generate and save a paper texture to the parent directory.
    """
    texture = generate_paper_noise(size[0], size[1], intensity)

    # Save to parent directory (where index.html is)
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    filepath = os.path.join(parent_dir, filename)

    texture.save(filepath)
    print(f"Paper texture saved to: {filepath}")
    return filepath

if __name__ == "__main__":
    # Generate a very fine, subtle matte paper texture
    save_paper_texture('paper_texture.png', size=(1024, 1024), intensity=0.06)

    # Also generate a slightly more pronounced version
    save_paper_texture('paper_texture_strong.png', size=(1024, 1024), intensity=0.10)