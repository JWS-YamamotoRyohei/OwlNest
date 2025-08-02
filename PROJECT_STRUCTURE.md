# OwlNest Project Structure

## Overview

This document describes the enhanced project structure for the OwlNest discussion platform, designed to support scalable development and maintainability.

## Directory Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Common reusable components (Button, Input, etc.)
│   ├── auth/            # Authentication related components
│   ├── discussion/      # Discussion related components
│   ├── user/            # User related components
│   └── forms/           # Form components
├── pages/               # Page components (route handlers)
├── hooks/               # Custom React hooks
├── services/            # API communication services
├── store/               # State management (Context API)
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
├── styles/              # Style definitions
│   ├── themes/          # Theme system (colors, typography, spacing)
│   ├── components/      # Component-specific styles
│   └── globals/         # Global styles
└── assets/              # Static resources
    ├── images/          # Image files
    ├── icons/           # Icon files
    └── fonts/           # Font files
```

## Key Features

### TypeScript Configuration
- Enhanced with path mapping for cleaner imports
- Strict type checking enabled
- Support for both `src` and `cdk` directories

### Design System
- Comprehensive color palette with light/dark theme support
- Typography system with Japanese font support
- Consistent spacing and layout system
- Responsive breakpoints

### Development Tools
- ESLint with import ordering rules
- Prettier for code formatting
- Additional npm scripts for linting and type checking

### State Management
- Context API based architecture
- Theme management with localStorage persistence
- Global error handling system

### API Integration
- Base API service with error handling
- JWT token management
- Type-safe API responses

## Usage Examples

### Importing with Path Mapping
```typescript
// Instead of relative imports
import { Button } from '../../../components/common/Button';

// Use path mapping
import { Button } from '@/components/common';
```

### Using the Theme System
```typescript
import { useTheme } from '@/store';

const MyComponent = () => {
  const { currentTheme, toggleTheme } = useTheme();
  
  return (
    <div style={{ color: currentTheme.colors.text }}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};
```

### Type-Safe API Calls
```typescript
import { apiService } from '@/services/api';
import { Discussion } from '@/types';

const discussions = await apiService.get<Discussion[]>('/discussions');
```

## Development Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Environment Configuration

Copy `.env.example` to `.env.local` and configure your environment variables:

```bash
# AWS Configuration
REACT_APP_AWS_REGION=ap-northeast-1
REACT_APP_AWS_USER_POOL_ID=your-user-pool-id
# ... other variables
```

## Next Steps

This structure provides a solid foundation for implementing the discussion platform features. The next tasks will involve:

1. Setting up AWS CDK infrastructure
2. Implementing authentication with AWS Cognito
3. Building the discussion and post management features
4. Adding real-time communication capabilities

## Contributing

When adding new features:
1. Follow the established directory structure
2. Use TypeScript for all new code
3. Add appropriate type definitions
4. Include tests for new functionality
5. Follow the established naming conventions