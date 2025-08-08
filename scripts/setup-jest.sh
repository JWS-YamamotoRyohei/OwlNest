#!/bin/bash

# Jest setup script for Unix/Linux/macOS

echo "Setting up Jest for OwlNest project..."

# Remove Vitest dependencies
echo "Removing Vitest dependencies..."
npm uninstall vitest @vitest/ui @vitest/coverage-v8

# Install Jest dependencies for frontend
echo "Installing Jest dependencies..."
npm install --save-dev jest @types/jest ts-jest jest-environment-jsdom
npm install --save-dev identity-obj-proxy

# Install additional testing utilities
echo "Installing additional testing utilities..."
npm install --save-dev @testing-library/jest-dom

echo "Jest setup completed!"
echo "You can now run tests with: npm test"