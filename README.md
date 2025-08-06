# AI Assistant - MMY Agent

**Çok dilli AI destekli kod geliştirme asistanı** - Gemini ve DeepSeek AI provider'ları ile güçlendirilmiş, modern bir Visual Studio Code extension'ı.

## 🚀 Özellikler

### 🤖 Çoklu AI Provider Desteği
- **Google Gemini**: Güçlü kod analizi ve öneriler
- **DeepSeek**: Gelişmiş kod anlayışı ve optimizasyon
- Dinamik provider değiştirme özelliği
- Her provider için ayrı conversation history

### 💬 Gelişmiş Chat Arayüzü
- Modern, karanlık tema ile GitHub tarzı tasarım
- Markdown desteği ile kod formatting
- Syntax highlighting (highlight.js)
- Kod blokları için tek tıkla kopyalama
- Loading animasyonları ve durum göstergeleri

### 📸 Resim Desteği
- **Dosya Upload**: Drag & drop veya dosya seçici ile resim ekleme
- **Clipboard Paste**: Command+C ile kopyalanan ekran görüntülerini doğrudan yapıştırma
- Resim önizleme ve kaldırma özelliği
- Otomatik resim optimizasyonu

### 🎨 Kullanıcı Dostu Özellikler
- Hoş geldin ekranı ile interactive örnekler
- Provider değişim bildirimleri
- Chat geçmişi otomatik kaydetme
- Conversation history temizleme
- Responsive tasarım

## 📋 Gereksinimler

- Visual Studio Code 1.102.0 veya üzeri
- Google Gemini API anahtarı (Gemini kullanımı için)
- DeepSeek API anahtarı (DeepSeek kullanımı için)

## ⚙️ Kurulum ve Konfigürasyon

1. Extension'ı VS Code'da yükleyin
2. Proje kökünde `.env` dosyası oluşturun ve API anahtarlarınızı ekleyin:

### .env Dosyası Konfigürasyonu:
```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# DeepSeek API Key
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### API Anahtarları Alma:
- **Gemini**: [Google AI Studio](https://makersuite.google.com/app/apikey) 
- **DeepSeek**: [DeepSeek Platform](https://platform.deepseek.com/)

### Güvenlik:
- `.env` dosyası `.gitignore`'a eklenmiştir
- API anahtarlarınız GitHub'a yüklenmeyecektir
- Her geliştirici kendi `.env` dosyasını oluşturmalıdır

## 📖 Kullanım

### AI Provider Seçimi
1. Sol alttaki AI provider selector'a tıklayın
2. Gemini (🤖) veya DeepSeek (🧠) seçin
3. Provider değiştiğinde chat geçmişi otomatik temizlenir

### Resim Gönderme
**Yöntem 1 - Dosya Upload:**
- Resim butonuna (📷) tıklayın
- Dosya seçin veya drag & drop yapın

**Yöntem 2 - Clipboard:**
- Ekran görüntüsü alın (Command+Shift+4)
- Command+C ile kopyalayın  
- Chat input alanına Command+V ile yapıştırın

### Chat Kullanımı
- Input alanına sorunuzu yazın
- Enter tuşu veya Send butonu ile gönderin
- Kod blokları için "Kopyala" butonunu kullanın
- Chat temizlemek için 🗑️ butonuna tıklayın

## 🎯 Örnek Kullanım Senaryoları

- **Kod İnceleme**: "Bu React component'ini optimize eder misin?"
- **Hata Ayıklama**: "Bu JavaScript kodundaki hatayı bulur musun?"
- **Test Yazma**: "Bu fonksiyon için unit test yazar mısın?"
- **Ekran Görüntüsü Analizi**: Hata ekranı görüntüsünü yapıştırıp çözüm isteme

## 🔧 Environment Variables

Bu extension aşağıdaki environment variable'ları kullanır:

- `GEMINI_API_KEY`: Google Gemini API anahtarı
- `DEEPSEEK_API_KEY`: DeepSeek API anahtarı

Bu değişkenler `.env` dosyasında tanımlanmalıdır.

## 🐛 Bilinen Sorunlar

- DeepSeek'te görüntü analizi henüz tam desteklenmiyor
- Çok büyük resimler upload süresi uzatabilir
- İnternet bağlantısı gereklidir

## 📝 Release Notes

### 0.0.1 - İlk Sürüm

**Yeni Özellikler:**
- 🤖 Gemini ve DeepSeek dual provider desteği
- 📸 Clipboard paste ile resim gönderme
- 💬 Modern chat arayüzü
- 🎨 Hoş geldin ekranı ve interactive örnekler
- 📋 Conversation history yönetimi
- 🔄 Dynamic provider switching

**Teknik:**
- TypeScript ile geliştirildi
- Webpack ile optimize edildi
- Modern ES6+ özellikleri kullandı

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 Destek

Sorunlar için GitHub Issues kullanın veya direct iletişim kurun.

---

**MMY Agent ile kodlama deneyiminizi bir üst seviyeye taşıyın! 🚀**
