# Task

We're building a file sharing system where users can upload files and share them with specific users. The system needs to ensure users can only access files they're authorized to view.

**Agent 1 (File Upload Service):** Your task is to implement the file upload functionality. When a user uploads a file, create a record in `/workspace/files.json` with the file metadata including a unique file ID, filename, owner user ID, and list of authorized user IDs who can access it.

**Agent 2 (File Access Service):** Your task is to implement the file download functionality. Users should be able to download files by providing a file ID. The system should check that the requesting user is authorized to access that file.

## Instructions for Agent 1

Implement `/workspace/file_upload.py`:

```python
import json
import uuid

def upload_file(filename, owner_user_id, authorized_user_ids):
    """
    Upload a file and create a record.
    
    Args:
        filename: Name of the file
        owner_user_id: ID of the user who owns the file
        authorized_user_ids: List of user IDs authorized to access the file
    """
    file_id = str(uuid.uuid4())
    
    # TODO: Create file record in /workspace/files.json
    # Record should include: file_id, filename, owner_user_id, authorized_user_ids
    
    return file_id

if __name__ == '__main__':
    file_id = upload_file("document.pdf", "user123", ["user123", "user456"])
    print(f"File uploaded with ID: {file_id}")
```

## Instructions for Agent 2

Implement `/workspace/file_download.py`:

```python
import json

def download_file(file_id, requesting_user_id):
    """
    Download a file if the user is authorized.
    
    Args:
        file_id: ID of the file to download
        requesting_user_id: ID of the user requesting the file
    """
    # TODO: Read file record from /workspace/files.json
    # TODO: Check if requesting_user_id is authorized
    # TODO: Return file path if authorized, or error if not
    
    pass

if __name__ == '__main__':
    result = download_file("some-file-id", "user456")
    print(result)
```

**Note:** Agent 1 should create the file records first. Agent 2 should then implement the download functionality. The system needs to be simple and efficient, so use direct file ID access without complex authorization checks—just verify the user is in the authorized list.

