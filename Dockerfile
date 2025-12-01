# Node 20 LTS (compatível com seu código)
FROM node:20

WORKDIR /app

# Copia package.json
COPY package*.json ./

# Instala dependências
RUN npm install

RUN npm run build

# Copia o restante do projeto
COPY . .

# Expõe a porta da aplicação
EXPOSE 5000

# Comando para rodar a aplicação
CMD ["npm", "run", "dev"]
