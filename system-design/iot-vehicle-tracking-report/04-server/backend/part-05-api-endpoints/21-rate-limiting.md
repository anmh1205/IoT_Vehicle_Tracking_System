## PHẦN XI.21: RATE LIMITING

### XI.21 Rate Limiting

**Limits:**

- Public endpoints: 100 requests/hour
- Authenticated endpoints: 1000 requests/hour
- Admin endpoints: 5000 requests/hour

**Response Headers:**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705318800
```

---

