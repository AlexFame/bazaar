# Sentry Configuration

To enable error logging with Sentry:

1. Create a free account at [sentry.io](https://sentry.io)
2. Create a new Next.js project in Sentry
3. Copy your DSN (Data Source Name)
4. Add the following to your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token (optional, for source map uploads)
```

5. Restart your development server

## Testing Sentry

To test if Sentry is working, you can trigger a test error:

```javascript
throw new Error("Sentry test error");
```

The error should appear in your Sentry dashboard within a few seconds.

## Features Enabled

- ✅ Client-side error tracking
- ✅ Server-side error tracking
- ✅ Edge runtime error tracking
- ✅ Session replay (10% of sessions)
- ✅ Error replay (100% of errors)
- ✅ Performance monitoring (10% of transactions)
- ✅ Custom error boundary with user-friendly UI
- ✅ Source map uploading (when auth token is provided)
