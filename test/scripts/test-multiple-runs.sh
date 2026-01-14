#!/bin/bash

# Script to test multiple test runs to ensure idempotency
# Tests should pass every time without conflicts

set -e  # Exit on error

echo "🧪 Testing multiple test runs for idempotency..."
echo ""

RUNS=3
FAILED=0

for i in $(seq 1 $RUNS); do
  echo "================================================"
  echo "🔄 Test Run #$i of $RUNS"
  echo "================================================"

  # Run integration tests
  echo "▶️  Running integration tests..."
  if npm run test:integration > /tmp/test-run-$i-integration.log 2>&1; then
    echo "✅ Integration tests passed (Run #$i)"
  else
    echo "❌ Integration tests failed (Run #$i)"
    FAILED=$((FAILED + 1))
    echo "📋 Tail of log:"
    tail -30 /tmp/test-run-$i-integration.log
  fi

  echo ""
  sleep 2  # Brief pause between runs
done

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"
echo "Total runs: $RUNS"
echo "Failed runs: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo "✅ All test runs passed! Tests are idempotent."
  exit 0
else
  echo "❌ $FAILED test run(s) failed. Check logs in /tmp/test-run-*.log"
  exit 1
fi
