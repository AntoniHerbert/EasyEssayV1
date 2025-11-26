

# 📝 EasyEssay

<div align="center">

![Badge em Desenvolvimento](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Postgres](https://img.shields.io/badge/Postgres-Required-336791)
![AI Powered](https://img.shields.io/badge/AI-Groq-orange)

**Sua plataforma inteligente de redação, correção colaborativa e conexões sociais.**

[Sobre](#-sobre) • [Funcionalidades](#-funcionalidades) • [Pré-requisitos](#-pré-requisitos) • [Como Rodar](#-como-rodar) • [Tecnologias](#-tecnologias)

</div>

---

## 🚀 Sobre

O **EasyEssay** é uma plataforma web inovadora focada em melhorar a escrita de seus usuários. Utilizando o poder da Inteligência Artificial (via Groq), o sistema oferece correções detalhadas de redações. Além disso, promovemos o aprendizado social através de funcionalidades de comunidade, onde usuários podem corrigir textos uns dos outros, fazer amizades e trocar mensagens em tempo real.

## ✨ Funcionalidades

- 🤖 **Correção via IA:** Envie sua redação e receba feedback instantâneo e detalhado gerado por inteligência artificial.
- 👥 **Correção Comunitária:** Participe da comunidade corrigindo redações de outros usuários e recebendo feedback humano.
- 🤝 **Sistema de Amizades:** Adicione outros estudantes e escritores à sua rede.
- 💬 **Chat em Tempo Real:** Troque mensagens, dicas e dúvidas com seus amigos na plataforma.

## 🛠 Pré-requisitos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas em sua máquina:

* **[Docker](https://www.docker.com/)** e **Docker Compose**
* **[PostgreSQL](https://www.postgresql.org/)** (Instalado e rodando localmente)
* Uma chave de API válida da **[Groq](https://console.groq.com/)**

## 🏃 Como Rodar

Siga o passo a passo abaixo para executar o projeto em seu ambiente de desenvolvimento.

### 1. Clone o repositório

```bash
git clone [https://github.com/AntoniHerbert/EasyEssayV1](https://github.com/AntoniHerbert/EasyEssayV1)
cd EasyEssayV1
```

### 2. Configuração do Banco de Dados

O projeto espera que você tenha uma instância do PostgreSQL rodando **localmente** na sua máquina (fora do Docker).

1.  Certifique-se de que o serviço do Postgres está ativo.
2.  Crie um banco de dados com o nome padrão (ou altere conforme sua preferência, veja nota abaixo):

```sql
CREATE DATABASE "EasyEssay_db";
```

> **Nota:** O `docker-compose.dev.yml` já possui configurações de ambiente apontando para o host local. Se você decidir usar um nome de banco diferente de `EasyEssay_db`, lembre-se de ajustar a variável de ambiente correspondente no arquivo .yml.

### 3. Configuração da API Groq

O sistema utiliza a Groq para as funcionalidades de IA. Você precisa configurar sua chave de acesso:

1.  Abra o arquivo `docker-compose.dev.yml` no seu editor de código.
2.  Localize a variável de ambiente referente à API Key (OPENAI_API_KEY).
3.  Substitua o valor de template (chave falsa) pela sua chave real obtida no console da Groq.

### 4. Executando o Projeto

Com tudo configurado, execute o comando abaixo na raiz do projeto para construir e subir os containers em modo destacável (background):

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

### 5. Acessando

Após os containers subirem, a aplicação deve estar disponível no seu navegador. (porta: `http://localhost:5000`).

## 🧰 Tecnologias

As seguintes ferramentas foram usadas na construção deste projeto:

-   **Docker & Docker Compose** - Containerização
-   **PostgreSQL** - Banco de Dados Relacional
-   **Groq API** - Inteligência Artificial Generativa
-   **Express** - Backend
-   **React** - Frontend


---

<div align="center">
  <sub>Desenvolvido por AntoniHerbert</sub>
</div>

