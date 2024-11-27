FROM node:16-alpine AS base

LABEL org.opencontainers.image.authors="cbg8279@naver.com,ya@urdekcah.ru,raphael070929@naver.com"
LABEL org.opencontainers.image.description="Второй семестровый командный проект по предмету "Веб-программирование": Простая доска объявлений на Node.js"
LABEL org.opencontainers.image.source="https://github.com/urdekcah/beacon"
LABEL org.opencontainers.image.vendor="Fishydino"
LABEL org.opencontainers.image.licenses="AGPL-3.0"
LABEL security.privileged="false"
LABEL maintainer.team="Beacon Baekgeon <beacon@sunrin.ru>"

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

FROM base AS final
RUN apk add --no-cache python3 py3-pip && pip3 install mysql-connector-python colorama

COPY scripts /usr/src/app/scripts
COPY schemas /usr/src/app/schemas

COPY docker-entrypoint.sh /usr/src/app/docker-entrypoint.sh
RUN chmod +x /usr/src/app/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]