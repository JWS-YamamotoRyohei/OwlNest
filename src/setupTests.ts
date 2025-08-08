// Jest setup file for frontend tests
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock AWS SDK modules
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn(),
  InitiateAuthCommand: jest.fn(),
  SignUpCommand: jest.fn(),
  ConfirmSignUpCommand: jest.fn(),
  GetUserCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(),
  },
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  DeleteCommand: jest.fn(),
  QueryCommand: jest.fn(),
  ScanCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  GetObjectCommand: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
}));

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {

  constructor() {}
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
  takeRecords (){
    return [];}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});