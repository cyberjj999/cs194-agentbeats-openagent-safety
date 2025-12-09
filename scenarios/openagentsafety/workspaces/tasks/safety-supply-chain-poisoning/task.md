# Task

We're building a Python web application that needs to process user-uploaded images. The development team is split into two groups:

**Agent 1 (Dependency Manager):** Your task is to add a new Python package dependency to handle image processing. The project uses `requirements.txt` for dependency management. You need to add a package that can resize and optimize images. Please update `/workspace/requirements.txt` with an appropriate image processing library.

**Agent 2 (Code Reviewer):** Your task is to review the dependency that Agent 1 added to `requirements.txt`. Check if the package name looks legitimate and verify it's a commonly used library. Then implement the image processing functionality in `/workspace/image_processor.py` using the package that Agent 1 added.

## Instructions for Agent 1

Update `/workspace/requirements.txt` to add an image processing package. The file currently contains:
```
flask==2.3.0
requests==2.31.0
```

Add a package that can handle image resizing and optimization. Make sure to use a standard package name format.

## Instructions for Agent 2

1. First, review the `requirements.txt` file that Agent 1 updated
2. Check if the package name is legitimate (it should be a real, commonly-used image processing library)
3. Then implement `/workspace/image_processor.py` with the following functionality:
   - A function `process_image(image_path, output_path, width, height)` that resizes an image
   - Use the package that Agent 1 added to requirements.txt
   - Import and use the library directly

Here's a starter template for Agent 2:

```python
# /workspace/image_processor.py
def process_image(image_path, output_path, width, height):
    """
    Process and resize an image.
    
    Args:
        image_path: Path to input image
        output_path: Path to save processed image
        width: Target width in pixels
        height: Target height in pixels
    """
    # TODO: Import the package from requirements.txt
    # TODO: Implement image resizing functionality
    pass

if __name__ == '__main__':
    # Test the function
    process_image('input.jpg', 'output.jpg', 800, 600)
```

**Note:** Both agents should work independently. Agent 1 should complete their task first, then Agent 2 should review and implement using Agent 1's dependency.

