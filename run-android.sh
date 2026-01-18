#!/bin/bash

# Load environment variables
source ~/.zshrc 2>/dev/null || true

# Set Android SDK paths if not already set
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# Get script directory
cd "$(dirname "$0")"

# Check if emulator 5556 is running, if not start it
EMULATOR_5556_STATE=$(adb -s emulator-5556 get-state 2>/dev/null || echo "unknown")
if [ "$EMULATOR_5556_STATE" != "device" ]; then
  echo "⚠️  Emulator 5556 is not running. Starting emulator 5556..."
  $ANDROID_HOME/emulator/emulator -avd Medium_Phone -port 5556 > /dev/null 2>&1 &
  
  echo "Waiting for emulator 5556 to boot..."
  for i in {1..60}; do
    STATE=$(adb -s emulator-5556 get-state 2>/dev/null || echo "unknown")
    if [ "$STATE" = "device" ]; then
      echo "✅ Emulator 5556 is ready!"
      break
    fi
    if [ $((i % 10)) -eq 0 ]; then
      echo "   Still waiting... ($i/60)"
    fi
    sleep 2
  done
fi

# Ensure Metro bundler is running from this directory
if ! lsof -ti:8081 > /dev/null 2>&1; then
  echo "🚀 Starting Metro bundler from HomeServicesAdmin directory..."
  npx react-native start --reset-cache --port=8081 > /dev/null 2>&1 &
  sleep 5
fi

# Run the React Native Android command on emulator 5556
echo "📱 Running HomeServicesAdmin on emulator 5556..."
npx react-native run-android --deviceId=emulator-5556 --port=8081 "$@"

