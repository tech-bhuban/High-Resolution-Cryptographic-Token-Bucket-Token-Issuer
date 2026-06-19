
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const tokenBucketStore = new Map();
const BUCKET_CAPACITY = 5.0;
const REFILL_RATE_PER_SEC = 0.5;

// Advanced: Token Bucket Allocation Check Middleware
const tokenBucketLimiter = (req, res, next) => {
    const ip = req.ip || '127.0.0.1';
    const nowHr = process.hrtime();
    const nowMs = (nowHr[0] * 1000) + (nowHr[1] / 1e6); // Microsecond accuracy precision

    if (!tokenBucketStore.has(ip)) {
        tokenBucketStore.set(ip, { tokens: BUCKET_CAPACITY, lastRefilled: nowMs });
    }

    const bucket = tokenBucketStore.get(ip);
    const elapsedTimeSec = (nowMs - bucket.lastRefilled) / 1000;
    
    // Mathematically calculate partial token refills based on exact time delta
    bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + (elapsedTimeSec * REFILL_RATE_PER_SEC));
    bucket.lastRefilled = nowMs;

    if (bucket.tokens < 1.0) {
        const waitTimeSec = Math.ceil((1.0 - bucket.tokens) / REFILL_RATE_PER_SEC);
        res.setHeader('Retry-After', waitTimeSec);
        return res.status(429).json({ error: 'Saturated Burst Limits', retryInSeconds: waitTimeSec });
    }

    bucket.tokens -= 1.0; // Consume exactly one execution token unit
    res.setHeader('X-Quota-Remaining', bucket.tokens.toFixed(2));
    next();
};

app.use(express.json());
app.get('/api/secure-compute', tokenBucketLimiter, (req, res) => {
    res.json({ status: 'completed', computedAt: Date.now() });
});

app.listen(PORT, () => console.log(`🚀 Token Engine operating on port ${PORT}`));


// # 🪣 Token Bucket Token Issuer Pipeline

// An infrastructure utility protecting downstream microservices from unpredictable traffic spikes. This system uses high-resolution process timers to compute partial fractional token yields smoothly.

// ## 🛠 Advanced Features
// - **High-Resolution Microsecond Deltas**: Uses `process.hrtime` parameters to eliminate base millisecond system clock variations.
// - **Mathematical Token Yields**: Processes rate scaling smoothly without requiring resource-heavy background intervals.

// ## 🚀 Quick Start
// 1. `npm install express`
// 2. `node server.js`

