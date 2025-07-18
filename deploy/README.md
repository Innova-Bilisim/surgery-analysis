# Surgery Analysis - Docker Deployment Guide

Bu döküman Surgery Analysis uygulamasının Linux sunucusunda Docker ile deployment'ını açıklar.

## 📋 Gereksinimler

### Sistem Gereksinimleri
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **RAM**: Minimum 4GB, Önerilen 8GB+
- **CPU**: Minimum 2 core, Önerilen 4+ core
- **Disk**: Minimum 10GB boş alan
- **Network**: 3000, 80, 443 portlarına erişim

### Yazılım Gereksinimleri
- Docker 20.10+
- Docker Compose 2.0+
- Git

## 🚀 Kurulum

### 1. Docker Kurulumu (Ubuntu)
```bash
# Docker repository ekle
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker yükle
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Proje Klonlama
```bash
git clone <repository-url>
cd surgery-analysis/deploy
chmod +x deploy.sh
```

### 3. Ortam Hazırlığı
```bash
# Environment variables hazırla
cp env.production .env.production

# Değerleri düzenle (gerekirse)
nano .env.production

# Video dosyalarını GitHub'dan çektikten sonra manuel yerleştirin
# Video dosyaları .gitignore ile engellenmiştir (büyük boyut nedeniyle)
# Deploy script klasör yoksa otomatik oluşturacak ve bekleyecek

# Eğer video klasörü yoksa:
# mkdir -p ../public/videos

# Video dosyalarınızı kopyalayın:
cp /path/to/your/videos/*.mp4 ../public/videos/
# Varsayılan video dosyasını mutlaka ekleyin:
cp your-main-video.mp4 ../public/videos/video01.mp4

# Kontrol edin:
ls ../public/videos/  # video01.mp4 ve diğer videolar görünmeli

# SSL sertifikaları (Nginx kullanıyorsanız)
mkdir -p nginx/ssl
# cert.pem ve key.pem dosyalarını nginx/ssl/ klasörüne kopyalayın
```

## 🏃‍♂️ Çalıştırma

### Temel Kullanım
```bash
# Uygulamayı başlat
./deploy.sh start

# Uygulamayı durdur
./deploy.sh stop

# Uygulamayı yeniden başlat
./deploy.sh restart

# Logları görüntüle
./deploy.sh logs

# Durum kontrolü
./deploy.sh status
```

### Nginx ile Kullanım (SSL/HTTPS)
```bash
# SSL sertifikalarını yerleştir
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem

# Nginx ile başlat
./deploy.sh start-nginx
```

### Diğer Komutlar
```bash
# Docker image'leri yeniden build et
./deploy.sh build

# Sistem sağlık kontrolü
./deploy.sh health

# Temizlik (kullanılmayan Docker resources)
./deploy.sh cleanup

# Git'ten güncelle ve yeniden başlat
./deploy.sh update
```

## 🌐 Erişim URL'leri

### Sadece Uygulama
- **HTTP**: http://your-server-ip:3000

### Nginx ile
- **HTTP**: http://your-server-ip (otomatik HTTPS'e yönlendirir)
- **HTTPS**: https://your-server-ip

## ⚙️ Konfigürasyon

### Environment Variables
`.env.production` dosyasında gerekli ayarları yapın:

```bash
# ML Model Service URL
NEXT_PUBLIC_ML_MODEL_URL=http://localhost:13000

# MQTT WebSocket URL  
NEXT_PUBLIC_MQTT_WS_URL=ws://localhost:9001

# Video Configuration
NEXT_PUBLIC_VIDEO_BASE_PATH=/videos
NEXT_PUBLIC_DEFAULT_VIDEO=video01.mp4
```

### Docker Compose Override
Özel ayarlar için `docker-compose.override.yml` oluşturabilirsiniz:

```yaml
version: '3.8'
services:
  surgery-analysis:
    environment:
      - CUSTOM_ENV_VAR=value
    ports:
      - "8080:3000"  # Farklı port kullan
```

## 📊 İzleme ve Bakım

### Log İzleme
```bash
# Canlı loglar
./deploy.sh logs

# Docker container logları
docker logs surgery-analysis-web -f

# Nginx logları (eğer kullanıyorsanız)
docker logs surgery-analysis-nginx -f
```

### Performans İzleme
```bash
# Container resource kullanımı
docker stats

# Sistem resource kullanımı
htop
```

### Backup
```bash
# Uygulama verilerini yedekle
tar -czf surgery-analysis-backup-$(date +%Y%m%d).tar.gz \
  logs/ nginx/ssl/ .env.production

# Video dosyaları proje içinde olduğu için Git ile yedeklenir
# Eğer video dosyaları büyükse Git LFS kullanabilirsiniz
```

## 🔧 Sorun Giderme

### Yaygın Sorunlar

#### 1. Port 3000 Kullanımda
```bash
# Port'u kullanan process'i bul
sudo netstat -tlnp | grep :3000
sudo kill -9 <PID>
```

#### 2. Video Dosyalarına Erişilemiyor
```bash
# Video dosyalarının varlığını kontrol et
ls -la ../public/videos/
# video01.mp4 dosyasının var olduğundan emin olun

# Container içinden video dosyalarını kontrol et
docker exec -it surgery-analysis-web ls -la /app/public/videos/
```

#### 3. Docker Permission Denied
```bash
# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER
newgrp docker
```

#### 4. SSL Sertifika Hatası
```bash
# SSL dosyalarını kontrol et
ls -la nginx/ssl/
# cert.pem ve key.pem olmalı

# Sertifika geçerliliğini test et
openssl x509 -in nginx/ssl/cert.pem -text -noout
```

### Debug Mode
```bash
# Container içine gir
docker exec -it surgery-analysis-web sh

# Detaylı loglar
docker-compose logs --tail=1000 surgery-analysis
```

## 🔄 Güncelleme

### Manuel Güncelleme
```bash
git pull
./deploy.sh build
./deploy.sh restart
```

### Otomatik Güncelleme
```bash
./deploy.sh update
```

## 🛡️ Güvenlik

### Firewall Ayarları
```bash
# UFW ile port açma
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # Direct app access (opsiyonel)
sudo ufw enable
```

### SSL/TLS
- Let's Encrypt sertifikası kullanın
- Strong cipher suites aktif
- HSTS headers aktif
- Rate limiting aktif

## 📞 Destek

Sorun yaşadığınızda:
1. Logları kontrol edin: `./deploy.sh logs`
2. Sistem durumunu kontrol edin: `./deploy.sh status`
3. Health check yapın: `./deploy.sh health`
4. GitHub Issues'da sorun bildirin

## 📝 Notlar

- Video dosyaları proje içinde saklanır (public/videos/)
- SSL sertifikaları manuel olarak yönetilmelidir
- MQTT ve ML Model servisleri harici olarak çalışmalıdır
- Production ortamında log rotation ayarlayın
- Büyük video dosyaları için Git LFS kullanmayı düşünün 