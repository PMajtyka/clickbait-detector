# Clickbait Detector - Instrukcja instalacji i konfiguracji

Rozszerzenie do przeglądarki Firefox, które automatycznie wykrywa clickbait w tytułach artykułów za pomocą sztucznej inteligencji.

## 📋 Wymagania

- Firefox w wersji 109 lub nowszej
- Konto na platformie OpenRouter
- Aktywne połączenie z internetem

## 🔧 Instalacja

### 1. Instalacja rozszerzenia w Firefox

1. **Pobierz pliki rozszerzenia** na swój komputer
2. Otwórz Firefox i wpisz w pasku adresu: `about:debugging`
3. Kliknij **"Ten Firefox"** w lewym menu
4. Kliknij przycisk **"Załaduj tymczasowy dodatek..."**
5. Wybierz plik `manifest.json` z folderu rozszerzenia
6. Rozszerzenie zostanie zainstalowane i pojawi się ikona w pasku narzędzi

### 2. Rejestracja na OpenRouter

1. Przejdź na stronę: https://openrouter.ai/
2. Kliknij **"Sign Up"** i załóż darmowe konto
3. Potwierdź adres email (jeśli wymagane)
4. Zaloguj się na swoje konto

### 3. Generowanie klucza API

1. Po zalogowaniu przejdź do sekcji **"Keys"** lub **"API Keys"**
2. Kliknij **"Create Key"** lub **"Generate API Key"**
3. Nadaj nazwę kluczowi (np. "Clickbait Detector")
4. **Skopiuj wygenerowany klucz** - będzie potrzebny w kolejnym kroku
5. **⚠️ WAŻNE:** Przechowuj klucz API w bezpiecznym miejscu

### 4. Wybór darmowego modelu AI

Na OpenRouter dostępne są m.in. następujące darmowe modele:
- **`google/gemma-7b-it:free`** - zalecany
- **`microsoft/phi-3-mini-128k-instruct:free`**
- **`google/gemma-2-9b-it:free`**

Sprawdź aktualną listę darmowych modeli na: https://openrouter.ai/models?order=newest&supported_parameters=tools&q=free

## ⚙️ Konfiguracja rozszerzenia

### 1. Otwórz ustawienia rozszerzenia

1. Kliknij prawym przyciskiem myszy na ikonę rozszerzenia w pasku narzędzi
2. Wybierz **"Opcje"** lub **"Zarządzaj rozszerzeniem"**
3. Przejdź do zakładki **"Ustawienia"**

### 2. Wprowadź dane konfiguracyjne

1. **Klucz API OpenRouter:**
   - Wklej skopiowany wcześniej klucz API

2. **Model AI:**
   - Wpisz nazwę wybranego darmowego modelu, np.: `google/gemma-7b-it:free`

3. **Kliknij "Zapisz ustawienia"**

## 🚀 Obsługa rozszerzenia

### Włączanie/wyłączanie

1. **Włączenie trybu sprawdzania:**
   - Naciśnij `Alt + Shift + C` 

2. **Sprawdzanie konkretnego linku:**
   - Najedź myszką na link artykułu
   - Naciśnij `Alt + C`
   - Poczekaj na wynik analizy AI

### Interpretacja wyników

- **🚫 CLICKBAIT** - tytuł jest clickbaitowy, z uzasadnieniem
- **✅ RZETELNY TYTUŁ** - tytuł jest rzetelny i informacyjny
- **🔄 Sprawdzanie...** - analiza w toku
- **❌ Błąd** - problem z połączeniem lub API

### Zamykanie wyników

- Kliknij **krzyżyk (✖)** w prawym górnym rogu tooltipa
- Tooltip z wynikami pozostaje widoczny do momentu ręcznego zamknięcia

## 🎯 Skróty klawiszowe

| Skrót | Działanie |
|-------|-----------|
| `Alt + Shift + C` | Włącz/wyłącz tryb sprawdzania |
| `Alt + C` | Sprawdź najechany link |

## ⚠️ Ograniczenia

**Rozszerzenie obecnie nie działa na niektórych stronach:**
- MSN.com 
- Strony z zaawansowanymi web components
- Portale używające shadow DOM
- Aplikacje SPA z dynamicznym ładowaniem treści

Pracuję nad rozszerzeniem kompatybilności z tymi platformami ale nie gwarantuję sukcesu.

## 🔧 Rozwiązywanie problemów

### Rozszerzenie nie wykrywa linków
1. Sprawdź czy tryb sprawdzania jest włączony (`Alt + Shift + C`)
2. Upewnij się, że najechałeś na link przed naciśnięciem `Alt + C`

### Błędy API
1. Sprawdź poprawność klucza API w ustawieniach
2. Upewnij się, że model AI jest wpisany poprawnie
3. Sprawdź czy masz aktywne połączenie z internetem

### Brak odpowiedzi AI
1. Spróbuj innego darmowego modelu
2. Sprawdź limity tokenów API na swoim koncie OpenRouter

## 📞 Wsparcie

W przypadku problemów:
1. Sprawdź konsolę przeglądarki (F12) pod kątem błędów
2. Upewnij się, że wszystkie ustawienia są poprawne
3. Przetestuj na różnych stronach internetowych

***

**Wersja:** 1.0  
**Kompatybilność:** Firefox 109+  
**Licencja:** MIT
