#!/bin/sh
# Requires Java 11 or newer.  Usage: ./run.sh [port]
cd "$(dirname "$0")"
java src/CampusConnectServer.java "$@"
