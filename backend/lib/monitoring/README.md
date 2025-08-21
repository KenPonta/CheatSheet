# Production Monitoring System

This directory contains the complete monitoring and deployment infrastructure for the Cheat Sheet Generator application.

## Overview

The monitoring system provides:
- **Error Tracking** with Sentry integration
- **Analytics** with PostHog integration  
- **AI Usage Tracking** for cost optimization
- **Health Monitoring** with automated alerts
- **Performance Monitoring** and metrics
- **Deployment Automation** with CI/CD pipelines

## Components

### 1. Error Tracking (`sentry.ts`)
- Automatic error reporting and performance monitoring
- Custom error filtering and context enrichment
- User context tracking and breadcrumb trails

### 2. Analytics (`analytics.ts`)
- User behavior tracking and workflow analytics
- AI service usage patterns and optimization insights
- Feature usage statistics and performance metrics

### 3. AI Usage Tracker (`ai-usage-tracker.ts`)
- Token usage monitoring and cost tracking
- Performance optimization suggestions
- Retry logic and error recovery tracking

### 4. Health Monitor (`health-monitor.ts`)
- Continuous health checks with configurable intervals
- Automated alerting based on customizable rules
- Service status monitoring and degradation detection

### 5. Environment Configuration (`../config/environment.ts`)
- Type-safe environment variable validation
- Service availability checks and configuration management
- Development vs production configuration handling

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional but recommended for production
SENTRY_DSN=your_sentry_dsn
POSTHOG_KEY=your_posthog_key
NEW_RELIC_LICENSE_KEY=your_newrelic_key
```

### 2. Deployment Setup

The system includes automated deployment via GitHub Actions:

1. **Configure Vercel secrets** in your GitHub repository:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID` 
   - `VERCEL_PROJECT_ID`
   - `OPENAI_API_KEY`
   - `SENTRY_DSN`
   - `POSTHOG_KEY`

2. **Set up deployment environments**:
   - `staging` - for develop branch deployments
   - `production` - for main branch deployments

3. **Configure webhooks** (optional):
   - `SLACK_WEBHOOK_URL` for deployment notifications
   - `HEALTH_ALERT_WEBHOOK_URL` for health alerts

### 3. Manual Deployment

Use the deployment script for manual deployments:

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production  
npm run deploy:production

# Run health check
npm run health-check

# View monitoring stats (development)
npm run monitoring:stats
```

## Monitoring Features

### Health Checks

The system provides comprehensive health monitoring:

- **API Endpoint**: `/api/health`
- **Monitoring Dashboard**: `/api/monitoring/stats` (development only)
- **Automated Alerts**: Configurable rules for service degradation

### AI Usage Optimization

Track and optimize AI service usage:

```typescript
import { trackAIUsage } from './lib/monitoring/ai-usage-tracker';

// Wrap AI calls for automatic tracking
const result = await trackAIUsage(
  'topic-extraction',
  'extract-topics', 
  inputData,
  () => openai.chat.completions.create(...)
);
```

### Error Reporting

Automatic error tracking with context:

```typescript
import { reportError, addBreadcrumb } from './lib/monitoring/sentry';

// Add context before operations
addBreadcrumb('Starting file processing', 'process', { fileType: 'pdf' });

// Automatic error reporting
try {
  await processFile(file);
} catch (error) {
  reportError(error, { fileType: file.type, fileSize: file.size });
  throw error;
}
```

### Analytics Tracking

Track user workflows and feature usage:

```typescript
import { trackEvent, trackWorkflowStep } from './lib/monitoring/analytics';

// Track workflow progress
trackWorkflowStep('topic_selection');

// Track feature usage
trackEvent('feature_used', { 
  feature: 'reference_template',
  success: true 
});
```

## Development

### Running Tests

```bash
# Run all monitoring tests
npm test -- lib/monitoring

# Run with coverage
npm test -- lib/monitoring --coverage

# Watch mode
npm test -- lib/monitoring --watch
```

### Local Monitoring

In development, monitoring data is available via:

- **Health Check**: `http://localhost:3000/api/health`
- **Monitoring Stats**: `http://localhost:3000/api/monitoring/stats`
- **Browser Console**: `window.__monitoring` (development helper)

### Adding New Metrics

1. **Create tracking function** in appropriate service
2. **Add to analytics** for user-facing metrics
3. **Add to health monitor** for system health
4. **Update tests** to cover new functionality

## Production Considerations

### Security
- API keys are managed via environment variables
- Health endpoints require authentication in production
- Error reports are filtered to exclude sensitive data

### Performance
- Health checks are cached to prevent excessive load
- Metrics history is limited to prevent memory issues
- Background monitoring uses configurable intervals

### Scalability
- Monitoring services are designed for serverless deployment
- Metrics can be exported for external analysis
- Alert rules are configurable per environment

## Troubleshooting

### Common Issues

1. **Environment validation errors**:
   - Ensure all required environment variables are set
   - Check `.env.example` for required variables

2. **Health check failures**:
   - Verify API endpoints are accessible
   - Check network connectivity and timeouts
   - Review service-specific error messages

3. **Deployment failures**:
   - Verify Vercel configuration and secrets
   - Check build logs for specific errors
   - Ensure all dependencies are properly installed

### Debug Commands

```bash
# Validate environment configuration
npm run env:validate

# Manual health check
curl -f http://localhost:3000/api/health

# View monitoring statistics
curl -s http://localhost:3000/api/monitoring/stats | jq .

# Test deployment script
./scripts/deploy.sh test
```

## Monitoring Dashboards

### Health Status
- Overall system health and service status
- Response time trends and error rates
- Service dependency status and versions

### AI Usage Analytics  
- Token usage and cost tracking
- Request success rates and error patterns
- Performance optimization recommendations

### User Analytics
- Workflow completion rates and abandonment points
- Feature usage patterns and adoption metrics
- Error rates and user experience issues

For more detailed information, see the individual component documentation and inline code comments.