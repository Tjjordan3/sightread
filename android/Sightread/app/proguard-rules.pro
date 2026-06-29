# Sightread Android rules

-keep class com.meta.wearable.** { *; }
-keep class androidx.room.** { *; }
-keep @androidx.room.Entity class * { *; }
-keepclassmembers class * {
    @androidx.room.* <methods>;
}
-keepattributes Signature
-keepattributes *Annotation*
