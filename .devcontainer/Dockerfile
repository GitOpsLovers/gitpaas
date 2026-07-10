FROM node:26.1.0-alpine3.23

RUN apk add --no-cache git

RUN npm install --global corepack@latest && corepack enable pnpm

CMD ["tail", "-f", "/dev/null"]