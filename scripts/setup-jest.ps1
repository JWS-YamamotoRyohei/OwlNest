# Jest setup script for Windows PowerShell

Write-Host "Setting up Jest for OwlNest project..." -ForegroundColor Green

# Remove Vitest dependencies
Write-Host "Removing Vitest dependencies..." -ForegroundColor Yellow
npm uninstall vitest @vitest/ui @vitest/coverage-v8

# Install Jest dependencies for frontend
Write-Host "Installing Jest dependencies..." -ForegroundColor Yellow
npm install --save-dev jest @types/jest ts-jest jest-environment-jsdom
npm install --save-dev identity-obj-proxy

# Install additional testing utilities
Write-Host "Installing additional testing utilities..." -ForegroundColor Yellow
npm install --save-dev @testing-library/jest-dom

Write-Host "Jest setup completed!" -ForegroundColor Green
Write-Host "You can now run tests with: npm test" -ForegroundColor Cyan