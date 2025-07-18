# Surgery Analysis

Surgery Analysis uygulaması, ameliyat videolarını analiz eden AI destekli bir web uygulamasıdır.

## 🚀 Kurulum

### 1. Environment Variables
Önce environment variables dosyasını oluşturun:

```bash
# Development için
cp env.template .env.local
```

`env.template` dosyasını kopyalayıp `.env.local` olarak adlandırın ve değerleri ihtiyacınıza göre düzenleyin:

```bash
# ML Model Service URL
NEXT_PUBLIC_ML_MODEL_URL=http://10.10.10.210:13000

# MQTT WebSocket URL  
NEXT_PUBLIC_MQTT_WS_URL=ws://10.10.10.210:9001

# Video Configuration
NEXT_PUBLIC_VIDEO_BASE_PATH=/videos
NEXT_PUBLIC_DEFAULT_VIDEO=video01.mp4
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Development Sunucusunu Başlatın

```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacak.

## 📁 Video Dosyaları

Video dosyaları `public/videos/` klasöründe bulunmalıdır. Varsayılan olarak `video01.mp4` dosyası kullanılır.

```bash
# Video dosyasını proje içine ekleyin
mkdir -p public/videos
cp /path/to/your/video01.mp4 public/videos/
```

**Not**: Büyük video dosyaları için Git LFS kullanmayı düşünün.

## 🐳 Docker Deployment

Production deployment için `deploy/` klasöründeki Docker yapılandırmasını kullanın:

```bash
cd deploy

# Environment variables hazırla
cp env.production .env.production

# Değerleri düzenle (gerekirse)
nano .env.production

# Deploy et
./deploy.sh start
```

Detaylı deployment bilgileri için `deploy/README.md` dosyasına bakın.

## 🎬 Video Setup

⚠️ **Video dosyaları Git'e dahil edilmemiştir** (büyük boyut nedeniyle).

### 📥 GitHub'dan Çektikten Sonra:

1. **Proje klonlandıktan sonra video dosyalarını yerleştirin:**

```bash
# Video klasörü otomatik oluşacak (deploy script tarafından)
# Veya manuel oluşturun:
mkdir -p public/videos

# Video dosyalarınızı kopyalayın
cp /path/to/your/videos/*.mp4 public/videos/

# 🎯 Varsayılan video dosyası (ÖNEMLİ!)
cp your-main-video.mp4 public/videos/video01.mp4
```

2. **Deploy çalıştırın:**
```bash
cd deploy
./deploy.sh start  # Video kontrolü yapacak ve bekleyecek
```

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ML_MODEL_URL` | ML Model Service URL | `http://10.10.10.210:13000` |
| `NEXT_PUBLIC_MQTT_WS_URL` | MQTT WebSocket URL | `ws://10.10.10.210:9001` |
| `NEXT_PUBLIC_VIDEO_BASE_PATH` | Video files base path | `/videos` |
| `NEXT_PUBLIC_DEFAULT_VIDEO` | Default video file | `video01.mp4` |
| `NEXT_PUBLIC_API_BASE_URL` | API base URL | `http://localhost:3000` |

## 🔧 Geliştirme

```bash
# Development server
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```
