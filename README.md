# Drift 🌿

> *Thoughts drift in and out of our minds. Moments pass. Memories fade. Drift exists to capture them before they disappear.*

Drift is a calm, offline-first, private personal journal and thought-capture application built with React Native and Expo. It is designed to capture thoughts, voice recordings, and memories effortlessly without requiring accounts, internet connectivity, or complicated productivity workflows.

---

## 📖 Technical Documentation

Comprehensive technical documentation is available in the [`docs/`](./docs) directory:

| Document | Description |
| :--- | :--- |
| **[Architecture & Technical Design](./docs/ARCHITECTURE.md)** | Core architectural principles, high-level system diagrams, component layers, data flows, and runtime state machines. |
| **[Data Model & Storage Specification](./docs/DATA_MODEL.md)** | Relational SQLite schema, file system media directory architecture, indices, TypeScript contracts, and deletion lifecycle. |
| **[Security & Privacy Architecture](./docs/SECURITY_AND_PRIVACY.md)** | Threat model, salted SHA-256 PIN hashing, hardware-backed secure storage, biometric unlock pipeline, and app-lock lifecycle. |
| **[Media Subsystem Guide](./docs/MEDIA_SUBSYSTEM.md)** | Audio capture & playback pipeline (`expo-audio`), image acquisition (`expo-image-picker`), sandboxed persistence, and disk quota monitoring. |
| **[Developer & Operations Guide](./docs/DEVELOPMENT_GUIDE.md)** | Setup instructions, directory tour, design system tokens, theming conventions, and debugging workflows. |
| **[Product Philosophy (`agent.md`)](./agent.md)** | The original design manifesto, product principles, UX guidelines, and vision for Drift. |

---

## ✨ Key Features

- **Moment-Based Capture**: Rapidly record a thought, spoken voice memo, or photograph in seconds without tedious metadata forms.
- **Offline-First & Local-Only**: All moments, database indices, and media files are stored strictly on-device using SQLite and local sandboxed storage.
- **Hardware-Backed Security**: Optional passcode protection and biometric unlock (Face ID / Fingerprint) backed by the device's hardware Secure Enclave.
- **Calm, Atmospheric Aesthetics**: Carefully crafted design system ("Quiet Mist & Slate" dark mode and "Warm Linen" light mode) with subtle micro-interactions and audio waveforms.
- **Zero Telemetry**: No user accounts, no analytics tracking, no ads, and zero outbound network calls.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
# Start Expo Metro bundler
npm start

# Run directly on your platform of choice:
npm run ios       # iOS Simulator
npm run android   # Android Emulator
npm run web       # Web Browser preview
```

---

## 🛠 Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) & [Expo SDK 57](https://expo.dev/) (with [Expo Router](https://docs.expo.dev/router/introduction/))
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- **File System**: [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- **Media**: [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/) & [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/image-picker/)
- **Security**: [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/), & [Expo Local Authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- **Icons**: [Lucide Icons](https://lucide.dev/) (`lucide-react-native`)

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
