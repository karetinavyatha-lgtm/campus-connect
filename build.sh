#!/bin/sh
# Optional: compile to a class file instead of running from source (needs a JDK).
cd "$(dirname "$0")" && mkdir -p out && javac -d out src/CampusConnectServer.java && echo "Built. Run: java -cp out CampusConnectServer"
