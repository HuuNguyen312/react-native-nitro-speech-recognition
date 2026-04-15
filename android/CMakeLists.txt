project(NitroSpeechRecognition)
cmake_minimum_required(VERSION 3.9.0)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

add_library(NitroSpeechRecognition SHARED src/main/cpp/cpp-adapter.cpp)

# Include nitrogen-generated sources and link dependencies
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroSpeechRecognition+autolinking.cmake)
