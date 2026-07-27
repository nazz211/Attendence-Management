<<<<<<< HEAD
# ---------- Stage 1 : Build ----------
=======
>>>>>>> 0a56dfc (Update project)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

<<<<<<< HEAD
RUN npm install
=======
RUN npm ci
>>>>>>> 0a56dfc (Update project)

COPY . .

RUN npm run build


<<<<<<< HEAD
# ---------- Stage 2 : Production ----------
=======
>>>>>>> 0a56dfc (Update project)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

<<<<<<< HEAD
# Copy custom Nginx configuration
=======
>>>>>>> 0a56dfc (Update project)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
