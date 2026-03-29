# ClawHQ Platform - Deployment Guide

## Overview

This guide covers deploying the ClawHQ Platform to production. The platform consists of:
- **Frontend**: Next.js application (Vercel)
- **Backend**: FastAPI application (Railway/Render)
- **Database**: PostgreSQL (Railway/Supabase)
- **Cache**: Redis (Railway/Upstash)
- **Monitoring**: Langfuse

## Prerequisites

### Accounts Needed
1. **Vercel** - Frontend hosting
2. **Railway** or **Render** - Backend hosting
3. **Supabase** or **Railway PostgreSQL** - Database
4. **Upstash** or **Railway Redis** - Cache
5. **Cloudflare** - Domain and DNS
6. **Langfuse** - Monitoring and analytics

### Domain
- Register or use: `clawhqplatform.com`
- Configure DNS in Cloudflare

## Phase 1: Development Setup

### 1.1 Local Development
```bash
# Clone repository
git clone https://github.com/ModologyStudiosLLC/clawhq-platform.git
cd clawhq-platform

# Start development environment
./start.sh
```

### 1.2 Environment Variables
Create `.env` files for both frontend and backend:

**Backend (.env)**
```env
# Database
DATABASE_URL=postgresql://username:password@localhost/clawhq_platform

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Keys
OPENCLAW_API_KEY=your-openclaw-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

# Monitoring
LANGFUSE_SECRET_KEY=sk-lf-7f384f33-11ae-4f82-a1bb-631c6497f2dd
LANGFUSE_PUBLIC_KEY=pk-lf-56ef3389-3902-4bb4-96a4-b1cbd01a19fc
LANGFUSE_HOST=https://us.cloud.langfuse.com
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=ClawHQ Platform
NEXT_PUBLIC_VERSION=1.0.0
```

## Phase 2: Production Deployment

### 2.1 Database Setup (Supabase)

1. Create new project in Supabase
2. Get connection string from Settings → Database
3. Run migrations:
```sql
-- Create tables (simplified)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_heartbeat TIMESTAMP,
    cost_today DECIMAL(10, 2),
    uptime VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cost_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    agent_costs JSONB,
    model_breakdown JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Backend Deployment (Railway)

1. Create new project in Railway
2. Connect GitHub repository
3. Configure environment variables (copy from .env)
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add PostgreSQL and Redis services
6. Deploy

### 2.3 Frontend Deployment (Vercel)

1. Import project in Vercel
2. Connect GitHub repository
3. Configure build settings:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL
   - `NEXT_PUBLIC_APP_NAME`: ClawHQ Platform
5. Deploy

### 2.4 Domain Configuration (Cloudflare)

1. Add domain to Cloudflare
2. Configure DNS:
   - A record: `@` → Vercel IP
   - CNAME record: `www` → Vercel domain
   - CNAME record: `api` → Railway domain
3. Enable SSL/TLS (Full)
4. Configure caching and security rules

## Phase 3: Monitoring & Analytics

### 3.1 Langfuse Setup
1. Create project in Langfuse
2. Get API keys
3. Configure backend to send traces
4. Set up dashboards for:
   - Agent performance
   - Cost tracking
   - Error rates
   - User activity

### 3.2 Error Tracking (Sentry)
1. Create Sentry project
2. Add SDK to frontend and backend
3. Configure error alerts
4. Set up performance monitoring

### 3.3 Uptime Monitoring (Better Stack)
1. Create monitors for:
   - Frontend: `https://clawhqplatform.com`
   - Backend: `https://api.clawhqplatform.com/health`
   - API: `https://api.clawhqplatform.com/docs`
2. Set up alert notifications

## Phase 4: Security

### 4.1 Authentication
- Implement JWT-based authentication
- Add rate limiting
- Set up CORS properly
- Use HTTPS everywhere

### 4.2 Data Protection
- Encrypt sensitive data
- Regular backups
- Access logging
- Audit trails

### 4.3 API Security
- API key authentication for external services
- Request validation
- Input sanitization
- SQL injection prevention

## Phase 5: Scaling

### 5.1 Database Scaling
- Read replicas for PostgreSQL
- Connection pooling
- Query optimization
- Regular maintenance

### 5.2 Backend Scaling
- Horizontal scaling with load balancer
- Caching strategy
- Background job queue
- CDN for static assets

### 5.3 Frontend Scaling
- Static site generation where possible
- Image optimization
- Code splitting
- CDN caching

## Phase 6: Maintenance

### 6.1 Regular Tasks
- **Daily**: Check logs, monitor costs, review alerts
- **Weekly**: Backup verification, security scans, performance review
- **Monthly**: Dependency updates, database optimization, cost analysis

### 6.2 Backup Strategy
- Database: Daily automated backups
- Files: Weekly backups
- Configuration: Version controlled

### 6.3 Update Strategy
- Test in staging first
- Blue-green deployment for backend
- Feature flags for frontend
- Rollback plan

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check connection string
   - Verify network access
   - Check credentials

2. **CORS Errors**
   - Verify CORS configuration
   - Check allowed origins
   - Test with curl

3. **Performance Issues**
   - Check database queries
   - Monitor memory usage
   - Review caching strategy

### Monitoring Tools
- Railway/Render logs
- Vercel analytics
- Langfuse traces
- Sentry errors
- Better Stack uptime

## Cost Optimization

### Estimated Monthly Costs
- Vercel: $20 (Hobby plan)
- Railway: $5-20 (depending on usage)
- Supabase: $25 (Pro plan)
- Upstash: $10
- Cloudflare: $0 (Free tier)
- Langfuse: $0-25 (depending on usage)

### Cost Saving Tips
- Use free tiers where possible
- Implement caching to reduce database load
- Optimize images and assets
- Monitor and alert on cost thresholds

## Support Resources

### Documentation
- [ClawHQ Platform Docs](https://docs.clawhqplatform.com)
- [API Reference](https://api.clawhqplatform.com/docs)
- [GitHub Repository](https://github.com/ModologyStudiosLLC/clawhq-platform)

### Community
- [Discord](https://discord.gg/clawd)
- [GitHub Issues](https://github.com/ModologyStudiosLLC/clawhq-platform/issues)
- [Email Support](support@clawhqplatform.com)

### Status
- [Status Page](https://status.clawhqplatform.com)
- [Uptime Monitor](https://betterstack.com/clawhqplatform)

---

**Last Updated:** March 29, 2026  
**Version:** 1.0.0  
**Status:** Ready for Production Deployment