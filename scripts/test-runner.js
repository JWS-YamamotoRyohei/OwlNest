#!/usr/bin/env node

/**
 * Comprehensive test runner script
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  unit: {
    command: 'npm test -- --coverage --watchAll=false',
    description: 'Unit tests with coverage',
    timeout: 60000
  },
  integration: {
    command: 'npm test -- --testPathPattern=integration --watchAll=false',
    description: 'Integration tests',
    timeout: 120000
  },
  e2e: {
    command: 'npm test -- --testPathPattern=e2e --watchAll=false',
    description: 'End-to-end tests',
    timeout: 300000
  },
  performance: {
    command: 'npm test -- --testPathPattern=performance --watchAll=false',
    description: 'Performance tests',
    timeout: 180000
  },
  lint: {
    command: 'npm run lint',
    description: 'ESLint code quality checks',
    timeout: 30000
  },
  typecheck: {
    command: 'npm run type-check',
    description: 'TypeScript type checking',
    timeout: 60000
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);

// Test execution function
const runTest = async (testType, config) => {
  return new Promise((resolve, reject) => {
    log(`\n${colors.bright}Running ${testType} tests...${colors.reset}`);
    log(`Command: ${config.command}`, colors.cyan);
    
    const startTime = Date.now();
    const child = spawn('sh', ['-c', config.command], {
      stdio: 'pipe',
      timeout: config.timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const result = {
        testType,
        success: code === 0,
        duration,
        stdout,
        stderr
      };

      if (code === 0) {
        logSuccess(`${testType} tests completed in ${duration}ms`);
        resolve(result);
      } else {
        logError(`${testType} tests failed with code ${code}`);
        reject(result);
      }
    });

    child.on('error', (error) => {
      logError(`Failed to run ${testType} tests: ${error.message}`);
      reject({
        testType,
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });
    });
  });
};

// Coverage analysis
const analyzeCoverage = () => {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    logWarning('Coverage report not found');
    return null;
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const total = coverage.total;
    
    log('\n📊 Coverage Summary:', colors.bright);
    log(`  Statements: ${total.statements.pct}%`, 
        total.statements.pct >= 80 ? colors.green : colors.yellow);
    log(`  Branches: ${total.branches.pct}%`, 
        total.branches.pct >= 80 ? colors.green : colors.yellow);
    log(`  Functions: ${total.functions.pct}%`, 
        total.functions.pct >= 80 ? colors.green : colors.yellow);
    log(`  Lines: ${total.lines.pct}%`, 
        total.lines.pct >= 80 ? colors.green : colors.yellow);

    return total;
  } catch (error) {
    logError(`Failed to analyze coverage: ${error.message}`);
    return null;
  }
};

// Performance metrics analysis
const analyzePerformance = (results) => {
  log('\n⚡ Performance Metrics:', colors.bright);
  
  const performanceResult = results.find(r => r.testType === 'performance');
  if (performanceResult && performanceResult.stdout) {
    // Extract performance metrics from test output
    const metrics = performanceResult.stdout.match(/Performance.*?(\d+\.?\d*)ms/g);
    if (metrics) {
      metrics.forEach(metric => {
        log(`  ${metric}`, colors.cyan);
      });
    }
  }

  // Analyze test execution times
  log('\n⏱️  Test Execution Times:', colors.bright);
  results.forEach(result => {
    const color = result.duration < 30000 ? colors.green : 
                  result.duration < 60000 ? colors.yellow : colors.red;
    log(`  ${result.testType}: ${result.duration}ms`, color);
  });
};

// Generate test report
const generateReport = (results, coverage) => {
  const reportPath = path.join(process.cwd(), 'test-report.json');
  const htmlReportPath = path.join(process.cwd(), 'test-report.html');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    },
    coverage,
    results: results.map(r => ({
      testType: r.testType,
      success: r.success,
      duration: r.duration,
      error: r.error || null
    }))
  };

  // Write JSON report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logInfo(`Test report saved to ${reportPath}`);

  // Generate HTML report
  const htmlReport = generateHtmlReport(report);
  fs.writeFileSync(htmlReportPath, htmlReport);
  logInfo(`HTML report saved to ${htmlReportPath}`);

  return report;
};

// Generate HTML report
const generateHtmlReport = (report) => {
  const { summary, coverage, results } = report;
  
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - OwlNest</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        .test-result { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
        .test-result.success { border-left-color: #28a745; }
        .test-result.error { border-left-color: #dc3545; }
        .coverage-bar { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 80%); }
    </style>
</head>
<body>
    <div class="header">
        <h1>OwlNest Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Tests</h3>
            <p><strong>${summary.passed}</strong> passed</p>
            <p><strong>${summary.failed}</strong> failed</p>
            <p><strong>${summary.total}</strong> total</p>
        </div>
        <div class="metric">
            <h3>Duration</h3>
            <p><strong>${(summary.totalDuration / 1000).toFixed(2)}s</strong></p>
        </div>
        ${coverage ? `
        <div class="metric">
            <h3>Coverage</h3>
            <p>Statements: <strong>${coverage.statements.pct}%</strong></p>
            <p>Branches: <strong>${coverage.branches.pct}%</strong></p>
            <p>Functions: <strong>${coverage.functions.pct}%</strong></p>
            <p>Lines: <strong>${coverage.lines.pct}%</strong></p>
        </div>
        ` : ''}
    </div>

    <h2>Test Results</h2>
    ${results.map(result => `
        <div class="test-result ${result.success ? 'success' : 'error'}">
            <h3>${result.testType} ${result.success ? '✅' : '❌'}</h3>
            <p>Duration: ${result.duration}ms</p>
            ${result.error ? `<p class="error">Error: ${result.error}</p>` : ''}
        </div>
    `).join('')}

    ${coverage ? `
    <h2>Coverage Details</h2>
    <div class="metric">
        <h4>Statements (${coverage.statements.pct}%)</h4>
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${coverage.statements.pct}%"></div>
        </div>
        <p>${coverage.statements.covered}/${coverage.statements.total}</p>
    </div>
    ` : ''}
</body>
</html>
  `;
};

// Main execution function
const main = async () => {
  const args = process.argv.slice(2);
  const testTypes = args.length > 0 ? args : Object.keys(TEST_CONFIG);
  
  log(`${colors.bright}🧪 OwlNest Test Runner${colors.reset}`);
  log(`Running tests: ${testTypes.join(', ')}`, colors.cyan);
  
  const results = [];
  let hasFailures = false;

  // Run tests sequentially
  for (const testType of testTypes) {
    if (!TEST_CONFIG[testType]) {
      logWarning(`Unknown test type: ${testType}`);
      continue;
    }

    try {
      const result = await runTest(testType, TEST_CONFIG[testType]);
      results.push(result);
    } catch (error) {
      results.push(error);
      hasFailures = true;
    }
  }

  // Analyze results
  const coverage = analyzeCoverage();
  analyzePerformance(results);
  
  // Generate report
  const report = generateReport(results, coverage);
  
  // Final summary
  log(`\n${colors.bright}📋 Final Summary${colors.reset}`);
  log(`Total tests: ${results.length}`);
  log(`Passed: ${results.filter(r => r.success).length}`, colors.green);
  log(`Failed: ${results.filter(r => !r.success).length}`, colors.red);
  log(`Total duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`);

  if (coverage) {
    const avgCoverage = (
      coverage.statements.pct + 
      coverage.branches.pct + 
      coverage.functions.pct + 
      coverage.lines.pct
    ) / 4;
    
    log(`Average coverage: ${avgCoverage.toFixed(1)}%`, 
        avgCoverage >= 80 ? colors.green : colors.yellow);
  }

  // Exit with appropriate code
  process.exit(hasFailures ? 1 : 0);
};

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, runTest, analyzeCoverage, generateReport };