@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
set "ANDROID_HOME=c:\Users\sk902\OneDrive\Documents\Inspaer app\android-sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%PATH%"

cd android
call gradlew.bat assembleDebug
cd ..
copy android\app\build\outputs\apk\debug\app-debug.apk "c:\Users\sk902\OneDrive\Documents\InspireApp-local-debug.apk"
