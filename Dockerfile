FROM endeveit/docker-jq AS deps

COPY package.json /tmp

RUN jq '{ dependencies, devDependencies, scripts }' < /tmp/package.json > /tmp/deps.json

FROM node:14.8.0-alpine AS builder

WORKDIR /usr/src/app

COPY --from=deps /tmp/deps.json ./package.json
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

COPY tsconfig*.json ./

COPY src src

RUN yarn run build

## 

FROM node:14.8.0-alpine

ENV NODE_ENV=production

RUN apk add --no-cache tini

WORKDIR /usr/src/app

RUN chown node:node .

USER node

COPY --from=deps /tmp/deps.json ./package.json
COPY yarn.lock ./

RUN yarn

COPY emails emails/
COPY --from=builder /usr/src/app/dist/ dist/

EXPOSE 4000

ENTRYPOINT [ "/sbin/tini","--", "node", "dist/index.js" ]