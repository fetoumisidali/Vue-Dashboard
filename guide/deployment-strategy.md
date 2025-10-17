# Deployment Strategy Guide

## Overview
This guide covers comprehensive deployment strategies for your Vue dashboard application, including build optimization, CI/CD pipelines, environment management, and deployment to various platforms.

## Build Configuration

### 1. Environment-Specific Configuration
```javascript
// .env.development
VITE_APP_TITLE=Dashboard Development
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
VITE_ENABLE_VUE_DEVTOOLS=true
VITE_ENABLE_SOURCEMAPS=true
VITE_LOG_LEVEL=debug
VITE_MOCK_API=false
VITE_SENTRY_DSN=
```

```javascript
// .env.staging
VITE_APP_TITLE=Dashboard Staging
VITE_API_URL=https://staging-api.example.com/api
VITE_WS_URL=wss://staging-api.example.com
VITE_ENABLE_VUE_DEVTOOLS=false
VITE_ENABLE_SOURCEMAPS=true
VITE_LOG_LEVEL=info
VITE_MOCK_API=false
VITE_SENTRY_DSN=https://your-sentry-dsn-staging
```

```javascript
// .env.production
VITE_APP_TITLE=Dashboard
VITE_API_URL=https://api.example.com/api
VITE_WS_URL=wss://api.example.com
VITE_ENABLE_VUE_DEVTOOLS=false
VITE_ENABLE_SOURCEMAPS=false
VITE_LOG_LEVEL=error
VITE_MOCK_API=false
VITE_SENTRY_DSN=https://your-sentry-dsn-production
```

### 2. Multi-Environment Build Script
```javascript
// scripts/build.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default ({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  
  return defineConfig({
    plugins: [vue()],
    
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __ENV__: JSON.stringify(mode),
      __ENABLE_SENTRY__: env.VITE_SENTRY_DSN ? 'true' : 'false'
    },

    build: {
      // Environment-specific build options
      minify: mode === 'production' ? 'terser' : false,
      sourcemap: mode !== 'production',
      
      rollupOptions: {
        output: {
          // Different chunk splitting per environment
          manualChunks: mode === 'production' ? {
            vendor: ['vue', 'vue-router', 'pinia'],
            ui: ['lucide-vue-next']
          } : undefined
        }
      }
    },
    
    // Environment-specific server configuration
    server: env.VITE_MOCK_API === 'true' ? {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    } : undefined
  })
}
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Dashboard

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  test:
    runs-on: ubuntu-latest
    name: Test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit
        env:
          VITE_API_URL: http://localhost:3000/api

      - name: Run component tests
        run: npm run test:component

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    name: Build
    strategy:
      matrix:
        environment: [staging, production]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build:${{ matrix.environment }}
        env:
          VITE_SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-${{ matrix.environment }}
          path: dist/
          retention-days: 7

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    name: Deploy to Staging
    environment:
      name: staging
      url: https://staging-dashboard.example.com
    
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-staging
          path: dist/

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: dist/
          vercel-args: '--prod'

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: https://staging-dashboard.example.com

  deploy-production:
    runs-on: ubuntu-latest
    needs: [build, deploy-staging]
    if: github.ref == 'refs/heads/main'
    name: Deploy to Production
    environment:
      name: production
      url: https://dashboard.example.com
    
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-production
          path: dist/

      - name: Deploy to S3
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Sync to S3
        run: |
          aws s3 sync dist/ s3://dashboard-bucket --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          draft: false
          prerelease: false
```

### 2. Docker Configuration
```dockerfile
# Dockerfile
# Multi-stage build for optimized Docker image
FROM node:20-alpine AS builder

# Build arguments
ARG BUILD_ENV=production
ARG APP_VERSION=1.0.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build:${BUILD_ENV}

# Production stage
FROM nginx:alpine AS production

# Install dependencies
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy health check script
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Add labels
LABEL maintainer="your-email@example.com"
LABEL version="${APP_VERSION}"
LABEL description="Vue Dashboard Application"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Server configuration
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Handle Vue Router history mode
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy
        location /api/ {
            proxy_pass http://api-server:3000/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket proxy
        location /ws {
            proxy_pass http://api-server:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static assets caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options nosniff;
        }

        # Service Worker
        location = /sw.js {
            expires off;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
        }

        # Security blocks
        location ~ /\. {
            deny all;
        }

        location = /robots.txt {
            access_log off;
            log_not_found off;
        }
    }
}
```

### 3. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        BUILD_ENV: ${BUILD_ENV:-production}
        APP_VERSION: ${APP_VERSION:-latest}
    ports:
      - "${PORT:-80}:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - api-server
      - redis
    restart: unless-stopped
    networks:
      - app-network

  # API Server
  api-server:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./api:/app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - app-network

  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-dashboard}
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - app-network

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  # Nginx (reverse proxy)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

## Cloud Deployment

### 1. Vercel Configuration
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.example.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  },
  "redirects": [],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/api/:path*"
    }
  ]
}
```

### 2. AWS S3 + CloudFront Deployment
```bash
#!/bin/bash
# scripts/deploy-aws.sh

set -e

# Configuration
BUCKET_NAME="dashboard-bucket"
DISTRIBUTION_ID="E1234567890ABCD"
BUILD_DIR="dist"

echo "🚀 Starting AWS deployment..."

# Build application
echo "📦 Building application..."
npm run build:production

# Sync to S3
echo "⬆️  Syncing to S3 bucket: $BUCKET_NAME"
aws s3 sync $BUILD_DIR/ s3://$BUCKET_NAME \
  --delete \
  --exclude ".git/*" \
  --exclude "node_modules/*" \
  --content-type "text/html"

# Invalidate CloudFront cache
echo "♻️  Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "✅ Deployment completed successfully!"

# Output deployment info
echo "🌐 Application URL: https://dashboard.example.com"
echo "📊 CloudFront Distribution: $DISTRIBUTION_ID"
echo "🪣 S3 Bucket: $BUCKET_NAME"
```

### 3. Kubernetes Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard-app
  labels:
    app: dashboard
    environment: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dashboard
  template:
    metadata:
      labels:
        app: dashboard
        environment: production
    spec:
      containers:
      - name: dashboard
        image: dashboard-app:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_URL
          valueFrom:
            secretKeyRef:
              name: dashboard-secrets
              key: api-url
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: dashboard-service
spec:
  selector:
    app: dashboard
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - dashboard.example.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dashboard-service
            port:
              number: 80
```

## Monitoring and Observability

### 1. Health Check Script
```bash
#!/bin/bash
# healthcheck.sh

# Configuration
HEALTH_CHECK_URL="http://localhost:80"
MAX_RETRIES=30
RETRY_INTERVAL=2

# Function to check health
check_health() {
  response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || echo "000")
  
  if [ "$response" = "200" ]; then
    return 0
  else
    return 1
  fi
}

# Health check loop
attempt=1
while [ $attempt -le $MAX_RETRIES ]; do
  echo "Health check attempt $attempt/$MAX_RETRIES"
  
  if check_health; then
    echo "✅ Health check passed!"
    exit 0
  fi
  
  if [ $attempt -lt $MAX_RETRIES ]; then
    echo "❌ Health check failed, retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
  fi
  
  attempt=$((attempt + 1))
done

echo "💀 Health check failed after $MAX_RETRIES attempts"
exit 1
```

### 2. Monitoring Configuration
```yaml
# monitoring/docker-compose.monitoring.yml
version: '3.8'

services:
  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    restart: unless-stopped

  # AlertManager
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

## Database Migrations

### 1. Migration Script
```bash
#!/bin/bash
# scripts/migrate.sh

set -e

# Configuration
MIGRATION_PATH="./migrations"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/dashboard}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Running database migrations...${NC}"

# Check if database exists
echo "Checking database connection..."
psql "$DATABASE_URL" -c "SELECT version();" > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

# Run migrations
for migration in "$MIGRATION_PATH"/*.sql; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        echo "Running migration: $migration_name"
        
        # Check if migration already ran
        if psql "$DATABASE_URL" -c "SELECT 1 FROM migrations WHERE name = '$migration_name';" | grep -q "1"; then
            echo -e "${YELLOW}⏭️  Migration $migration_name already applied, skipping${NC}"
            continue
        fi
        
        # Run migration
        psql "$DATABASE_URL" -f "$migration"
        
        # Record migration
        psql "$DATABASE_URL" -c "INSERT INTO migrations (name, executed_at) VALUES ('$migration_name', NOW());"
        
        echo -e "${GREEN}✅ Migration $migration_name completed${NC}"
    fi
done

echo -e "${GREEN}🎉 All migrations completed successfully!${NC}"
```

## Rollback Strategy

### 1. Rollback Script
```bash
#!/bin/bash
# scripts/rollback.sh

set -e

# Configuration
BACKUP_DIR="./backups"
BUCKET_NAME="dashboard-bucket"
DISTRIBUTION_ID="E1234567890ABCD"
KEEP_BACKUPS=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Starting rollback process...${NC}"

# Get latest backup
LATEST_BACKUP=$(ls -1t "$BACKUP_DIR" | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}❌ No backups found${NC}"
    exit 1
fi

echo "Restoring from backup: $LATEST_BACKUP"

# Unzip backup
unzip -q "$BACKUP_DIR/$LATEST_BACKUP" -d /tmp/rollback/

# Sync to S3
echo "Restoring to S3 bucket: $BUCKET_NAME"
aws s3 sync /tmp/rollback/dist/ s3://$BUCKET_NAME \
  --delete

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Cleanup temporary files
rm -rf /tmp/rollback/

echo -e "${GREEN}✅ Rollback completed successfully!${NC}"

# Clean up old backups (keep only the latest 5)
echo "Cleaning up old backups..."
ls -1t "$BACKUP_DIR" | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f

echo -e "${GREEN}🧹 Cleanup completed${NC}"
```

## Usage Examples

### 1. Local Development Setup
```bash
# scripts/dev-setup.sh

#!/bin/bash

# Install dependencies
npm ci

# Copy environment files
cp .env.example .env.development

# Start development services
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### 2. Production Deployment
```bash
# scripts/deploy-production.sh

#!/bin/bash

# Pre-deployment checks
npm run test
npm run lint
npm run build:production

# Create backup
npm run backup

# Deploy
npm run deploy:production

# Post-deployment tests
npm run test:e2e
```

This comprehensive deployment strategy provides a robust, scalable, and maintainable deployment pipeline for your Vue dashboard application across different platforms and environments.
