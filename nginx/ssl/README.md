# SSL Certificate Directory

This directory should contain your SSL certificates:
- `fullchain.pem` - The full certificate chain
- `privkey.pem` - The private key

## Getting SSL Certificates

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
apt install -y certbot

# Get certificate (temporarily stop nginx)
systemctl stop nginx
certbot certonly --standalone -d managerip.o.io

# Copy certificates to this directory
cp /etc/letsencrypt/live/managerip.o.io/fullchain.pem ./fullchain.pem
cp /etc/letsencrypt/live/managerip.o.io/privkey.pem ./privkey.pem

# Restart nginx
systemctl start nginx
```

### Option 2: Self-signed Certificate (For testing only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=managerip.o.io"
```

## Auto-renewal with Let's Encrypt

Add to crontab:
```
0 0 1 * * docker exec ipmanagement-nginx certbot --renew && docker restart ipmanagement-nginx