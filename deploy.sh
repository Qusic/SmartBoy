#!/bin/bash
container=$(docker-compose ps -q smartboy)
env=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' $container | grep '^\(DEBUG\|LOCAL\|TOKEN\)=')
export $env
docker-compose down
docker-compose up -d --build
