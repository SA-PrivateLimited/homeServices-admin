#!/bin/bash

# Script to start HomeServicesAdmin on emulator 5556
# This ensures Metro bundler is running from the correct directory

# Load environment variables
source ~/.zshrc 2>/dev/null || true

# Set Android SDK paths if not already set
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📱 Starting HomeServicesAdmin on emulator 5556..."
echo "📂 Working directory: $SCRIPT_DIR"
echo ""

# Check if emulator 5556 is running
EMULATOR_STATUS=$(adb -s emulator-5556 get-state 2>/dev/null || echo "unknown")
if [ "$EMULATOR_STATUS" != "device" ]; then
  echo "⚠️  Emulator 5556 is not running or not available"
  echo "   Please start emulator 5556 first"
  exit 1
fi

echo "✅ Emulator 5556 is available"

# Kill any existing Metro bundler processes
echo "🛑 Stopping any existing Metro bundler processes..."
pkill -f "react-native start" || true
pkill -f "metro" || true
sleep 2

# Clean build
echo "🧹 Cleaning previous build..."
cd android
./gradlew clean || true
cd ..

# Start Metro bundler in background from correct directory
echo "🚀 Starting Metro bundler from $SCRIPT_DIR..."
npx react-native start --reset-cache &
METRO_PID=$!
echo "   Metro bundler PID: $METRO_PID"
echo "   Waiting for Metro to initialize..."
sleep 5

# Check if Metro is running
if ! ps -p $METRO_PID > /dev/null; then
  echo "❌ Failed to start Metro bundler"
  exit 1
fi

echo "✅ Metro bundler is running"
echo ""

# Build and install app on emulator 5556
echo "📦 Building and installing app on emulator 5556..."
npx react-native run-android --deviceId=emulator-5556 --no-packager

echo ""
echo "✨ HomeServicesAdmin should now be running on emulator 5556"
echo "   If you see registration errors, make sure Metro bundler is running from this directory"

