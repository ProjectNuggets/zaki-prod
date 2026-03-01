# ZAKI API Reference (Backend)

## Profile

### GET `/api/profile`
Returns the current user profile (from `zaki_users`). Requires `Authorization: Bearer <token>`.

**Response**
```json
{
  "success": true,
  "user": {
    "username": "user@example.com",
    "fullName": "Ada Lovelace"
  }
}
```

### PATCH `/api/profile`
Updates the user profile (currently `fullName`). Requires `Authorization: Bearer <token>`.

**Request**
```json
{
  "fullName": "Ada Lovelace"
}
```

**Response**
```json
{
  "success": true,
  "user": {
    "username": "user@example.com",
    "fullName": "Ada Lovelace"
  }
}
```

---

> Note: `fullName` is stored in `zaki_users.full_name`.

---

## Workspaces

### GET `/workspace/:slug`
Returns normalized workspace detail for the authenticated user.

Includes:
1. `instructions`
2. `pinnedFiles`
3. `documents`
4. `threads`

### POST `/workspace/:slug/update`
Updates supported workspace fields.

Supported request fields:
```json
{
  "name": "Research",
  "instructions": "Reply in one short paragraph.",
  "openAiPrompt": "Reply in one short paragraph."
}
```

### POST `/workspace/:slug/thread/new`
Creates a new thread inside the workspace.

### POST `/workspace/:slug/thread/:threadSlug/update`
Updates thread metadata, currently name.

### DELETE `/workspace/:slug/thread/:threadSlug`
Deletes a thread from the workspace.

---

## Workspace Documents

### GET `/api/documents/accepted-file-types`
Returns the supported upload MIME types and file extensions from TYP.

**Response**
```json
{
  "types": {
    "text/plain": [".txt", ".md"],
    "application/pdf": [".pdf"]
  }
}
```

### POST `/workspace/:slug/upload`
Uploads a document for the workspace without embedding it automatically.

### POST `/workspace/:slug/upload-and-embed`
Uploads a document and embeds it into the workspace knowledge base.

**Response**
```json
{
  "success": true,
  "files": [
    {
      "name": "notes.txt",
      "type": "document",
      "size": 42,
      "status": "embedded",
      "location": "workspace-demo/notes.txt-uuid.json",
      "source": "file:///app/collector/hotdir/notes.txt",
      "title": "notes.txt"
    }
  ]
}
```

### POST `/workspace/:slug/documents/remove`
Removes one or more workspace documents from embeddings and then removes them from TYP system storage.

**Request**
```json
{
  "locations": [
    "workspace-demo/notes.txt-uuid.json"
  ]
}
```

**Response**
```json
{
  "success": true,
  "removed": [
    "workspace-demo/notes.txt-uuid.json"
  ],
  "warning": null
}
```
