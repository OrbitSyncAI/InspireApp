@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
set "ANDROID_HOME=c:\Users\sk902\OneDrive\Documents\Inspaer app\android-sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%PATH%"

echo ======================================================
echo STEP 1: Installing Android SDK Platform and Build Tools
echo ======================================================
echo y| sdkmanager.bat --sdk_root="%ANDROID_HOME%" "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo ======================================================
echo STEP 2: Installing Capacitor Dependencies
echo ======================================================
call npm install @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6 --save-dev --prefer-offline --no-fund --no-audit

echo ======================================================
echo STEP 3: Building Web Bundle
echo ======================================================
call npm run build

echo ======================================================
echo STEP 4: Initializing Capacitor and Adding Android
echo ======================================================
if not exist capacitor.config.json (
  call npx cap init "InspireApp" "ai.orbitsync.inspireapp" --web-dir dist
)
if not exist android (
  call npx cap add android
)
call npx cap sync android

echo ======================================================
echo STEP 5: Compiling APK
echo ======================================================
cd android
call gradlew.bat assembleRelease
cd ..

echo ======================================================
echo BUILD COMPLETED SUCCESSFULLY!
echo ======================================================
