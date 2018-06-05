FROM golang:alpine AS builder
RUN apk --no-cache upgrade && apk --no-cache add git
WORKDIR /go/src/github.com/qusic/smartboy-tgbot
COPY *.go .
RUN go get && go install

FROM alpine:latest
RUN apk --no-cache upgrade && apk --no-cache add ca-certificates
COPY --from=builder /go/bin/smartboy-tgbot /usr/local/bin/

ENTRYPOINT ["smartboy-tgbot"]
