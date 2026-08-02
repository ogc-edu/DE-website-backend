@echo off
docker start de-db 2>nul || docker run -d -p 27017:27017 --name de-db mongodb/mongodb-atlas-local:8.0.0
npm run dev
