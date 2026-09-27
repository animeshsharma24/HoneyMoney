plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.honeymoney.app"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.honeymoney.app"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar"))))
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.core.ktx)
    implementation(libs.material)
    implementation(project(":capacitor-android"))
    implementation(project(":capacitor-cordova-android-plugins"))
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
}

// Satisfies Android Studio IDE sync for Kotlin DSL script model
tasks.register("prepareKotlinBuildScriptModel") {
    doLast {}
}
