# AI API Rental SaaS - Deployment Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.9+
- Virtual environment activated

### Setup Steps

1. **Install Dependencies**
```powershell
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

2. **Configure Environment**
- Copy `.env.example` to `.env`
- Update API keys and secrets

3. **Seed Database**
```powershell
python scripts/seed_database.py
```

4. **Start Server**
```powershell
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

5. **Run Tests**
```powershell
python scripts/test_backend.py
```

## 📋 Sample Plans Created

1. **15 Min Flash** - $2.99 (10K tokens, 10 RPM)
2. **1 Hour Pro** - $9.99 (50K tokens, 30 RPM)
3. **24 Hour Enterprise** - $49.99 (500K tokens, 100 RPM)
4. **GPT-4o Premium Hour** - $19.99 (30K tokens, 20 RPM, 10x drain rate)

## 🔑 Default Admin Credentials

- **Email**: admin@apirental.com
- **Password**: admin123

⚠️ **Change these in production!**

## 🌐 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Production Deployment

### 1. Update Environment Variables

```env
# Production Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Production Redis
REDIS_URL=redis://host:6379/0
USE_FAKE_REDIS=false

# Real API Keys
OPENAI_API_KEYS=sk-real-key-1,sk-real-key-2
GEMINI_API_KEYS=real-gemini-key-1,real-gemini-key-2
ANTHROPIC_API_KEYS=sk-ant-real-key-1,sk-ant-real-key-2

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Security
JWT_SECRET=<generate-secure-random-string>
ADMIN_PASSWORD=<strong-password>
```

### 2. Deploy with Docker

```bash
docker-compose up -d
```

### 3. Run Migrations

```bash
python scripts/seed_database.py
```

### 4. Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

### Status Page
```bash
curl http://localhost:8000/status/
```

### Admin Analytics
```bash
curl http://localhost:8000/admin/analytics/usage?hours=24
```

## 🧪 Testing Workflow

1. **Register User**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

2. **Login**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

3. **List Plans**
```bash
curl http://localhost:8000/api/plans
```

4. **Purchase Rental**
```bash
curl -X POST http://localhost:8000/api/rentals/purchase \
  -H "Content-Type: application/json" \
  -d '{"plan_id":1,"payment_method_id":"pm_test_123"}'
```

5. **Use Proxy**
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer vk_YOUR_VIRTUAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"gpt-4o-mini",
    "messages":[{"role":"user","content":"Hello!"}]
  }'
```

## 🔒 Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secret
- [ ] Enable HTTPS in production
- [ ] Restrict CORS origins
- [ ] Use real Stripe keys
- [ ] Implement rate limiting at reverse proxy
- [ ] Enable PII masking in logs
- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Backup database regularly

## 📈 Scaling Considerations

1. **Database**: Migrate to PostgreSQL with read replicas
2. **Redis**: Use Redis Cluster for high availability
3. **Load Balancing**: Deploy multiple backend instances
4. **CDN**: Cache static assets
5. **Monitoring**: Prometheus + Grafana
6. **Logging**: ELK Stack or CloudWatch

## 🐛 Troubleshooting

### Server won't start
- Check if port 8000 is available
- Verify virtual environment is activated
- Check `.env` file exists and is valid

### Database errors
- Run `python scripts/seed_database.py`
- Check SQLite file permissions

### Redis connection failed
- Ensure `USE_FAKE_REDIS=true` for local dev
- For production, verify Redis is running

### API key errors
- Update `.env` with real provider keys
- Check key rotation is working

## 📞 Support

For issues or questions:
1. Check logs in terminal
2. Review `progress.log`
3. Consult `walkthrough.md`
4. Check API docs at `/docs`

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-05  
**Status**: Production-Ready Backend ✅
