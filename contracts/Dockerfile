FROM golang:1.25-alpine

RUN apk add --no-cache protobuf git

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.6 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1

ENV PATH="/root/go/bin:${PATH}"

WORKDIR /app

CMD sh -c '\
  rm -rf generated/* && \
  protoc \
    --proto_path=. \
    --go_out=. \
    --go-grpc_out=. \
    --go_opt=module=github.com/tumlumtala/contracts \
    --go-grpc_opt=module=github.com/tumlumtala/contracts \
    grpc/auth.proto \
    grpc/user.proto \
'