pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Honeymoney"
include(":app")

val localCapacitorDir = file("./capacitor-android")
val nodeModulesCapacitorDir = file("../node_modules/@capacitor/android/capacitor")
if (localCapacitorDir.exists()) {
    include(":capacitor-android")
    project(":capacitor-android").projectDir = localCapacitorDir
} else if (nodeModulesCapacitorDir.exists()) {
    include(":capacitor-android")
    project(":capacitor-android").projectDir = nodeModulesCapacitorDir
}

val cordovaPluginsDir = file("./capacitor-cordova-android-plugins")
if (cordovaPluginsDir.exists()) {
    include(":capacitor-cordova-android-plugins")
    project(":capacitor-cordova-android-plugins").projectDir = cordovaPluginsDir
}
