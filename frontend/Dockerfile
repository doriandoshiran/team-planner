FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files AND .npmrc for legacy peer deps
COPY package*.json ./
COPY .npmrc ./

# Use npm ci with legacy peer deps support
RUN npm ci --legacy-peer-deps

COPY . .

# Set build-time environment variable
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

FROM nginx:alpine

# Copy the server block configuration to the default location
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy the built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
