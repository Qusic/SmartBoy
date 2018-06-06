#!/bin/bash
tag=smartboy-cscript:local
build() { docker container prune -f && docker build -t $tag . && docker image prune -f && docker run -it --init --rm $tag local ; }
clean() { docker image rm $tag || true ; }
[[ "$1" == "clean" ]] && clean || build
