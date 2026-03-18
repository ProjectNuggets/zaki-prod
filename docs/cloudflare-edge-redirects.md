# Cloudflare Edge Redirects (SEO Canonicalization)

Configure these as **301 (permanent)** Redirect Rules in Cloudflare for `chatzaki.com`.

## 1) Force HTTPS + apex domain

Rule name: `canonical-host-and-https`

Expression:

```txt
(http.host in {"www.chatzaki.com" "chatzaki.com"} and (http.request.scheme eq "http" or http.host eq "www.chatzaki.com"))
```

Dynamic redirect target:

```txt
concat("https://chatzaki.com", http.request.uri.path, if(len(http.request.uri.query) > 0, concat("?", http.request.uri.query), ""))
```

Status code: `301`

## 2) Canonicalize Arabic query route

Rule name: `arabic-query-to-path`

Expression:

```txt
(
  (http.host eq "chatzaki.com" or http.host eq "www.chatzaki.com") and
  lower(http.request.uri.path) eq "/" and
  lower(http.request.uri.query) contains "lang=ar"
)
```

Dynamic redirect target:

```txt
"https://chatzaki.com/ar/"
```

Status code: `301`

## 3) Optional cleanup for `www` Arabic route

Rule name: `www-arabic-path-to-apex`

Expression:

```txt
http.host eq "www.chatzaki.com" and starts_with(lower(http.request.uri.path), "/ar")
```

Dynamic redirect target:

```txt
concat("https://chatzaki.com", http.request.uri.path, if(len(http.request.uri.query) > 0, concat("?", http.request.uri.query), ""))
```

Status code: `301`

## Validation checklist

Run these checks after saving rules:

```bash
curl -I http://chatzaki.com/
curl -I http://www.chatzaki.com/
curl -I https://www.chatzaki.com/
curl -I "https://chatzaki.com/?lang=ar"
curl -I "https://www.chatzaki.com/?lang=ar"
```

Expected:
- All return `301` to canonical targets.
- Final destination is `https://chatzaki.com/` or `https://chatzaki.com/ar/`.
