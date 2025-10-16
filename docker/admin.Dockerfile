# syntax=docker/dockerfile:1.6
FROM node:18-alpine AS builder
WORKDIR /usr/src/app/admin

COPY admin/package*.json ./
RUN npm install

COPY admin ./
COPY shared ../shared
ARG VITE_API_BASE_URL=http://localhost:4000
ARG VITE_BRAND_NAME_EN=Nosh_Farmaiye
ARG VITE_BRAND_NAME_HI=Nosh_फ़रमाइए
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BRAND_NAME_EN=${VITE_BRAND_NAME_EN}
ENV VITE_BRAND_NAME_HI=${VITE_BRAND_NAME_HI}
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /usr/src/app/admin/dist /usr/share/nginx/html
COPY docker/admin.nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
