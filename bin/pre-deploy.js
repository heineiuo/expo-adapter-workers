#!/usr/bin/env bash
Function=Function//; NODE_NO_WARNINGS=1 node "$0" "$@"; exit

import('../dist/preDeploy.js')