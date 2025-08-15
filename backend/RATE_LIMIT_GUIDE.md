# Rate Limiting Guide for Tomorrow.io API

This guide explains how to prevent and handle 429 (Too Many Requests) errors from the Tomorrow.io API.

## 🚨 What Causes 429 Errors?

The Tomorrow.io API has rate limits:
- **Free Tier**: 1000 requests per day (~41 requests per hour)
- **Paid Tiers**: Higher limits based on your plan

When you exceed these limits, you get a 429 error.

## 🛡️ How We Prevent 429 Errors

### 1. **Rate Limiting**
- Automatic request counting per hour
- Prevents requests when limit is reached
- Configurable limits and time windows

### 2. **Request Caching**
- Weather data cached for 10 minutes
- Forecast data cached for 30 minutes
- Reduces API calls for repeated requests

### 3. **Retry Logic**
- Automatic retry with exponential backoff
- Smart retry decisions (doesn't retry on client errors)
- Configurable retry attempts and delays

### 4. **Graceful Error Handling**
- Clear error messages with retry times
- Rate limit information in API responses
- User-friendly error handling

## 📊 Monitoring Your API Usage

### Check Rate Limit Status
```bash
# Check current rate limit status
GET /api/weather/rate-limit

# Response includes:
{
  "success": true,
  "data": {
    "remainingRequests": 25,
    "resetTime": 1640995200000,
    "canProceed": true
  }
}
```

### Use the Monitoring Script
```bash
# Run the rate limit checker
cd backend
node scripts/check-rate-limit.js
```

## ⚙️ Configuration

### Rate Limiter Settings
```typescript
// backend/src/utils/rateLimiter.ts
export const tomorrowIORateLimiter = new RateLimiter({
  maxRequests: 35,        // Conservative limit (under 41/hour)
  windowMs: 60 * 60 * 1000, // 1 hour window
  retryAfterMs: 60 * 1000,  // 1 minute retry delay
});
```

### Cache Settings
```typescript
// backend/src/utils/cache.ts
export const weatherCache = new SimpleCache<any>(10 * 60 * 1000); // 10 minutes TTL
```

### Retry Settings
```typescript
// backend/src/utils/retry.ts
export const defaultRetryHandler = new RetryHandler({
  maxAttempts: 3,           // Max 3 retry attempts
  baseDelay: 1000,          // Start with 1 second delay
  maxDelay: 5000,           // Max 5 second delay
  backoffMultiplier: 2,     // Double delay each retry
});
```

## 🔧 Troubleshooting

### If You Still Get 429 Errors

1. **Check your current usage**:
   ```bash
   node scripts/check-rate-limit.js
   ```

2. **Reduce request frequency**:
   - Increase cache TTL values
   - Implement client-side caching
   - Batch multiple requests

3. **Monitor your API key usage**:
   - Check Tomorrow.io dashboard
   - Verify your plan limits
   - Consider upgrading if needed

### Common Issues

- **Cache not working**: Check if cache cleanup is running
- **Rate limiter too strict**: Adjust `maxRequests` in rate limiter config
- **Retries not working**: Check retry configuration and error types

## 📈 Best Practices

### 1. **Implement Client-Side Caching**
```typescript
// Frontend: Cache weather data locally
const cacheKey = `weather:${location}`;
const cached = localStorage.getItem(cacheKey);
if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < 10 * 60 * 1000) { // 10 minutes
    return data;
  }
}
```

### 2. **Batch Requests When Possible**
```typescript
// Instead of multiple individual requests
const weather = await getWeather(location1);
const forecast = await getForecast(location1);

// Use a single endpoint that returns both
const weatherData = await getWeatherAndForecast(location1);
```

### 3. **Implement Progressive Enhancement**
```typescript
// Show cached data immediately, then refresh
const [weather, setWeather] = useState(cachedWeather);
useEffect(() => {
  if (shouldRefresh) {
    fetchFreshWeather().then(setWeather);
  }
}, [shouldRefresh]);
```

## 🆘 Emergency Override

If you need to temporarily bypass rate limiting:

```typescript
// In emergency situations only
process.env.BYPASS_RATE_LIMIT = 'true';
```

**⚠️ Warning**: This will remove all protection and could result in API suspension.

## 📞 Support

If you continue to experience issues:

1. Check the Tomorrow.io API status page
2. Verify your API key and plan limits
3. Review your application's request patterns
4. Consider implementing additional caching strategies

## 🔄 Updates and Maintenance

The rate limiting system automatically:
- Cleans up expired cache entries
- Resets rate limit counters hourly
- Logs all rate limit events
- Provides detailed error information

Monitor the logs for any unusual patterns or errors.
