# Deployment Guide - Vullaby

## 🚀 Quick Deployment with Docker

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Git

### Production Deployment

1. **Clone and Configure**
```bash
git clone https://github.com/matills/vullaby.git
cd vullaby
cp .env.example .env
# Edit .env with your credentials
```

2. **Start Services**
```bash
docker-compose up -d
```

3. **Verify**
```bash
# Check services status
docker-compose ps

# Check backend health
curl http://localhost:3000/health

# View logs
docker-compose logs -f
```

### Development Setup

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Backend will be available at http://localhost:3000
# Frontend will be available at http://localhost:5173
```

## 🔧 CI/CD Pipeline

The project uses GitHub Actions for automated testing and deployment.

### Automated Tests
- Runs on every push to `main`, `develop`, or `claude/**` branches
- Runs on every pull request
- Tests both backend and frontend
- Builds Docker images
- Checks code quality

### Coverage Requirements
- Minimum 70% coverage for branches, functions, lines, and statements
- Coverage reports uploaded to Codecov

### Workflow Stages
1. **Backend Tests** - Jest tests + lint + build
2. **Frontend Tests** - Lint + build
3. **Docker Build** - Test Docker builds
4. **Code Quality** - Super-Linter checks

## 📦 Manual Deployment

### Backend

```bash
cd backend
npm ci
npm run build
NODE_ENV=production node dist/index.js
```

### Frontend

```bash
cd frontend
npm ci
npm run build
# Deploy dist/ folder to static hosting
```

## 🏗️ Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Supabase   │
│  (React)    │     │  (Express)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Twilio    │
                    │  (WhatsApp) │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │   (Queue)   │
                    └─────────────┘
```

## 🔐 Environment Variables

### Required Variables

**Backend:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` - WhatsApp number
- `DEFAULT_BUSINESS_ID` - Default business ID

**Frontend:**
- `VITE_SUPABASE_URL` - Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Supabase key
- `VITE_API_URL` - Backend API URL

## 📊 Monitoring

### Health Checks
- Backend: `GET /health`
- Returns: `{ status: 'OK', timestamp: '...', service: 'lina-backend' }`

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Change ports in docker-compose.yml or stop conflicting services
lsof -ti:3000 | xargs kill
lsof -ti:5173 | xargs kill
```

**Database Connection Failed**
- Verify SUPABASE_URL and SUPABASE_ANON_KEY
- Check Supabase project status
- Verify network connectivity

**WhatsApp Not Working**
- Verify Twilio credentials
- Check webhook configuration
- Verify phone number format

## 🔄 Updates and Rollbacks

### Update to Latest Version
```bash
git pull
docker-compose build
docker-compose up -d
```

### Rollback
```bash
git checkout <previous-commit>
docker-compose build
docker-compose up -d
```

## 💾 Backup and Recovery

### Database Backup
```bash
# Supabase handles automatic backups
# Manual backup via Supabase dashboard
```

### Application Backup
```bash
# Backup docker volumes
docker-compose down
tar -czf backup-$(date +%Y%m%d).tar.gz \
  docker-compose.yml \
  .env \
  /var/lib/docker/volumes/vullaby_*
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Add load balancer (nginx) in front
```

### Vertical Scaling
- Increase Docker container resources
- Adjust NODE_OPTIONS for heap size

## 🔒 Security Checklist

- [ ] Change default credentials
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Environment variable encryption

## 📞 Support

For deployment issues:
- Check logs: `docker-compose logs`
- GitHub Issues: https://github.com/matills/vullaby/issues
- Health endpoint: http://localhost:3000/health
