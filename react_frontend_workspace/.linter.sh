#!/bin/bash
cd /home/kavia/workspace/code-generation/secureshare-reactfastapi-28210-545eb221/react_frontend_workspace/react_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

