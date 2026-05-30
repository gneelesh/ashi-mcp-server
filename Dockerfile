FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./

ENV PORT=3000
ENV ASHI_JEWELER_ID=CARTJA11720
ENV ASHI_USERNAME=avalontester1@gmail.com
ENV ASHI_PASSWORD=""
ENV ASHI_JEWELSOFTID=""

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
