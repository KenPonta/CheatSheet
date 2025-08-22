# Memory Management Guide

This guide helps you manage memory usage effectively while developing with the CheatSheet Creator.

## Quick Commands

```bash
# Check current memory usage
npm run memory:check

# Clean up memory and caches
npm run memory:clean

# Start development server with memory optimization
npm run memory:dev

# Check system memory status
npm run system:check

# Optimize entire system memory
npm run system:optimize
```

## Memory Optimization Features

### 1. Automatic Memory Management
- **Memory monitoring**: Tracks usage and warns at 80%/90% thresholds
- **Process cleanup**: Automatically kills redundant Next.js processes
- **Cache clearing**: Removes build caches and temporary files

### 2. Development Server Optimization
- **Memory limits**: Node.js configured with 4GB max heap size
- **Low-memory mode**: Alternative mode with 2GB limit for constrained systems
- **Build optimization**: Webpack configured for memory efficiency

### 3. System-Level Optimization
- **Application management**: Closes memory-heavy apps (Discord, browsers)
- **Cache clearing**: Removes system and user caches
- **Garbage collection**: Forces system memory cleanup

## Memory Usage Thresholds

| Usage | Status | Action |
|-------|--------|--------|
| < 80% | 🟢 Normal | Continue development |
| 80-90% | 🟡 Warning | Consider cleanup |
| > 90% | 🔴 Critical | Automatic optimization |

## Configuration Files

### Next.js Configuration (`next.config.mjs`)
```javascript
experimental: {
  memoryBasedWorkers: true,
  webpackBuildWorker: true,
}
compiler: {
  removeConsole: process.env.NODE_ENV === 'production',
}
swcMinify: true,
```

### Package.json Scripts
```json
{
  "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev",
  "dev:low-memory": "NODE_OPTIONS='--max-old-space-size=2048 --optimize-for-size' next dev"
}
```

### Environment Variables (`.env.development`)
```bash
NODE_OPTIONS=--max-old-space-size=4096 --optimize-for-size
NEXT_TELEMETRY_DISABLED=1
MAX_FILE_SIZE=10485760
MAX_FILES_PER_REQUEST=5
DISABLE_HEALTH_MONITORING=true
```

## Troubleshooting

### High Memory Usage
1. Run `npm run system:optimize` to free up system memory
2. Close unnecessary browser tabs and applications
3. Restart the development server with `npm run memory:dev`
4. Use low-memory mode: `npm run dev:low-memory`

### Memory Errors During Build
1. Clear build cache: `rm -rf .next`
2. Use memory-optimized build: `NODE_OPTIONS='--max-old-space-size=6144' npm run build`
3. Build in production mode to enable optimizations

### File Processing Errors
1. Reduce file size limits in `.env.development`
2. Process fewer files at once
3. Use the memory-optimized development server

## Best Practices

### Development
- Use `npm run memory:dev` instead of `npm run dev`
- Monitor memory usage with `npm run memory:check`
- Close unused applications before starting development
- Process files in smaller batches

### Production
- Use production builds which are more memory efficient
- Configure Vercel functions with appropriate memory limits
- Enable caching to reduce processing overhead

### System Maintenance
- Run `npm run system:optimize` weekly
- Restart your Mac if memory usage remains high
- Consider upgrading RAM if you frequently hit limits

## Memory Limits by Environment

| Environment | Node.js Heap | Vercel Function | File Processing |
|-------------|--------------|-----------------|-----------------|
| Development | 4GB | N/A | 10MB per file |
| Production | 1GB | 1GB | 50MB per file |
| Low Memory | 2GB | 512MB | 5MB per file |

## Monitoring Tools

### Built-in Commands
- `npm run memory:check` - Node.js memory usage
- `npm run system:check` - System memory status
- `top -o mem` - System process memory usage

### Activity Monitor
1. Open Activity Monitor
2. Sort by Memory column
3. Identify memory-heavy processes
4. Quit unnecessary applications

## Emergency Procedures

### Critical Memory Usage (>95%)
1. **Immediate**: Run `npm run system:optimize`
2. **Force quit** memory-heavy applications
3. **Restart** development server
4. **Reboot** system if necessary

### Out of Memory Errors
1. **Stop** all development servers
2. **Clear** all caches: `npm run memory:clean`
3. **Restart** with low-memory mode
4. **Process files** in smaller batches

## Hardware Recommendations

### Minimum Requirements
- 8GB RAM (development possible but limited)
- Use low-memory mode and small file batches

### Recommended
- 16GB RAM (comfortable development)
- Can process larger files and multiple projects

### Optimal
- 32GB+ RAM (no memory constraints)
- Can handle large files and multiple heavy applications

## Support

If you continue to experience memory issues:
1. Check the troubleshooting section above
2. Review your system's Activity Monitor
3. Consider hardware upgrades
4. Use the low-memory development mode