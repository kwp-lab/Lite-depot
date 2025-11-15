# LiteDepot (轻量级进出库管理软件)

**Lightweight Inventory Management System**

A desktop application for managing product inventory with barcode scanning support. Built with Electron, React, and TypeScript.

## Features

- 📦 **Product Inbound**: Quick product check-in with barcode scanning
- 📤 **Batch Outbound**: Scan multiple products for batch checkout with borrower tracking
- 📋 **Inventory Check**: Complete inventory auditing with unscanned product reporting
- ⚙️ **Settings**: Easy configuration and product synchronization
- 🔄 **AITable Integration**: Seamless integration with AITable API
- 💾 **Offline Support**: Local IndexedDB caching for fast lookups
- 🖥️ **Cross-platform**: Windows (primary), macOS, and Linux support

## Technology Stack

- **Desktop Framework**: Electron
- **UI Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Local Database**: IndexedDB (via Dexie.js)
- **Build Tool**: Vite
- **API Integration**: AITable

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/kwp-lab/Lite-depot.git
cd Lite-depot

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Configuration

1. Launch the application
2. On first run, you'll see the Setup page
3. Enter your AITable credentials
4. Configure field mappings if needed
5. Click "Start Using" to begin

## Project Structure

```
src/
├── api/              # AITable API service layer
├── components/       # Reusable UI components
├── db/              # IndexedDB configuration
├── lib/             # Utility functions
├── pages/           # Application pages/routes
├── store/           # Zustand state management
└── types/           # TypeScript type definitions
```


**LiteDepot** - 让货品管理更简单 (Making product management easier)
