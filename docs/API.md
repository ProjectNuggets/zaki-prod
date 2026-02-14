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
